const Customer = require("../models/Customer");
const Booking = require("../models/Booking");
const LedgerEntry = require("../models/LedgerEntry");
const Payment = require("../models/Payment");
const { AppError } = require("../middleware/errors");
const { normalizePhone, detectNetwork } = require("../utils/phone");
const { generateSequentialCode } = require("../utils/generateId");
const { writeAuditLog } = require("../utils/audit");
const { calcBalance } = require("./ledger.calc");

function prepareContacts(rawContacts = []) {
  const prepared = rawContacts.map((c, idx) => {
    const normalizedPhone = normalizePhone(c.phone);
    if (!normalizedPhone) {
      throw new AppError(
        `Invalid Malawi phone number for contact "${c.name}"`,
        400,
        "VALIDATION_ERROR",
      );
    }
    return {
      ...c,
      phone: normalizedPhone,
      network: detectNetwork(normalizedPhone, undefined, c.network || null),
      isPrimary: idx === 0 ? true : Boolean(c.isPrimary),
    };
  });

  const primaryCount = prepared.filter((c) => c.isPrimary).length;
  if (primaryCount === 0 && prepared.length > 0) {
    prepared[0].isPrimary = true;
  } else if (primaryCount > 1) {
    let seenPrimary = false;
    for (const c of prepared) {
      if (c.isPrimary && !seenPrimary) {
        seenPrimary = true;
      } else if (c.isPrimary) {
        c.isPrimary = false;
      }
    }
  }

  return prepared;
}

async function listCustomers({
  q = "",
  status = "",
  includeArchived = false,
} = {}) {
  const filter = {};
  if (!includeArchived) {
    filter.archivedAt = null;
  }
  if (status && ["ACTIVE", "WATCHLIST", "BLOCKED"].includes(status)) {
    filter.status = status;
  }
  if (q && q.trim()) {
    const term = q.trim();
    const digitsOnly = term.replace(/\D/g, "");
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { name: regex },
      { code: regex },
      { area: regex },
      { "contacts.name": regex },
      { "contacts.phone": digitsOnly ? new RegExp(digitsOnly) : regex },
    ];
  }

  return Customer.find(filter).sort({ createdAt: -1 }).lean();
}

async function createCustomer(payload, user, req) {
  const contacts = prepareContacts(payload.contacts);
  const code = await generateSequentialCode(Customer, "C", 4);

  const customer = await Customer.create({
    ...payload,
    code,
    contacts,
    formAcceptedAt: payload.formAcceptedAt
      ? new Date(payload.formAcceptedAt)
      : null,
    createdBy: user?._id || null,
  });

  await writeAuditLog({
    userId: user?._id || null,
    action: "CUSTOMER_CREATED",
    entityType: "CUSTOMER",
    entityId: customer._id,
    after: {
      code: customer.code,
      name: customer.name,
      status: customer.status,
    },
    req,
  });

  return customer;
}

async function getCustomerDetail(id) {
  const customer = await Customer.findById(id).lean();
  if (!customer) {
    throw new AppError("Customer not found", 404, "NOT_FOUND");
  }

  const [bookings, ledgerEntries, payments] = await Promise.all([
    Booking.find({ customerId: customer._id }).sort({ startDate: -1 }).lean(),
    LedgerEntry.find({ customerId: customer._id })
      .sort({ date: -1, createdAt: -1 })
      .lean(),
    Payment.find({ customerId: customer._id })
      .sort({ paidDate: -1, createdAt: -1 })
      .lean(),
  ]);

  const balance = calcBalance(ledgerEntries, payments);

  return {
    customer,
    balance,
    bookings,
    ledgerEntries,
    payments,
  };
}

async function updateCustomer(id, payload, user, req) {
  const customer = await Customer.findById(id);
  if (!customer) {
    throw new AppError("Customer not found", 404, "NOT_FOUND");
  }

  const before = customer.toObject();
  Object.assign(customer, payload);
  if (payload.formAcceptedAt !== undefined) {
    customer.formAcceptedAt = payload.formAcceptedAt
      ? new Date(payload.formAcceptedAt)
      : null;
  }
  await customer.save();

  await writeAuditLog({
    userId: user?._id || null,
    action: "CUSTOMER_UPDATED",
    entityType: "CUSTOMER",
    entityId: customer._id,
    before: {
      name: before.name,
      status: before.status,
      depositRequired: before.depositRequired,
    },
    after: {
      name: customer.name,
      status: customer.status,
      depositRequired: customer.depositRequired,
    },
    req,
  });

  return customer;
}

async function setCustomerStatus(id, { status, reason }, user, req) {
  const customer = await Customer.findById(id);
  if (!customer) {
    throw new AppError("Customer not found", 404, "NOT_FOUND");
  }

  const prevStatus = customer.status;
  customer.status = status;
  if (reason) {
    customer.notes = customer.notes
      ? `${customer.notes}\n[${status}] ${reason}`
      : `[${status}] ${reason}`;
  }
  await customer.save();

  await writeAuditLog({
    userId: user?._id || null,
    action: "CUSTOMER_STATUS_CHANGED",
    entityType: "CUSTOMER",
    entityId: customer._id,
    before: { status: prevStatus },
    after: { status: customer.status, reason },
    req,
  });

  return customer;
}

async function addContact(id, contactPayload, user, req) {
  const customer = await Customer.findById(id);
  if (!customer) {
    throw new AppError("Customer not found", 404, "NOT_FOUND");
  }

  const normalizedPhone = normalizePhone(contactPayload.phone);
  if (!normalizedPhone) {
    throw new AppError("Invalid Malawi phone number", 400, "VALIDATION_ERROR");
  }

  if (contactPayload.isPrimary) {
    for (const c of customer.contacts) {
      c.isPrimary = false;
    }
  }

  customer.contacts.push({
    ...contactPayload,
    phone: normalizedPhone,
    network: detectNetwork(
      normalizedPhone,
      undefined,
      contactPayload.network || null,
    ),
  });

  await customer.save();
  await writeAuditLog({
    userId: user?._id || null,
    action: "CUSTOMER_CONTACT_ADDED",
    entityType: "CUSTOMER",
    entityId: customer._id,
    after: { phone: normalizedPhone, name: contactPayload.name },
    req,
  });

  return customer;
}

async function archiveCustomer(id, user, req) {
  const customer = await Customer.findById(id);
  if (!customer) {
    throw new AppError("Customer not found", 404, "NOT_FOUND");
  }

  customer.archivedAt = new Date();
  await customer.save();

  await writeAuditLog({
    userId: user?._id || null,
    action: "CUSTOMER_ARCHIVED",
    entityType: "CUSTOMER",
    entityId: customer._id,
    after: { archivedAt: customer.archivedAt },
    req,
  });

  return customer;
}

module.exports = {
  listCustomers,
  createCustomer,
  getCustomerDetail,
  updateCustomer,
  setCustomerStatus,
  addContact,
  archiveCustomer,
};
