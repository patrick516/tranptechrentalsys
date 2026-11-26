const Booking = require("../models/Booking");
const Customer = require("../models/Customer");
const LedgerEntry = require("../models/LedgerEntry");
const Payment = require("../models/Payment");
const StockMovement = require("../models/StockMovement");
const Settings = require("../models/Settings");
const { AppError } = require("../middleware/errors");
const { toBusinessDate, addBusinessDays } = require("../utils/dates");
const { generateSequentialCode } = require("../utils/generateId");
const { writeAuditLog } = require("../utils/audit");
const { calcAvailabilityRange } = require("./stock");
const {
  buildInitialHireEntries,
  buildExtensionHireEntries,
  calcBalance,
} = require("./ledger.calc");

async function getDefaultSettings() {
  const doc = await Settings.findOne({ key: "default" }).lean();
  return {
    ratePerChairPerDay: doc?.ratePerChairPerDay ?? 400,
    lateFeePerDay: doc?.lateFeePerDay ?? 2000,
    graceDays: doc?.graceDays ?? 0,
  };
}

async function listBookings({
  status = "",
  customerId = "",
  from = "",
  to = "",
} = {}) {
  const filter = {};
  if (status && ["RESERVED", "OUT", "RETURNED", "CANCELLED"].includes(status)) {
    filter.status = status;
  }
  if (customerId) {
    filter.customerId = customerId;
  }
  if (from) {
    filter.endDate = { ...(filter.endDate || {}), $gte: from };
  }
  if (to) {
    filter.startDate = { ...(filter.startDate || {}), $lte: to };
  }

  return Booking.find(filter)
    .populate("customerId", "code name type status area contacts")
    .sort({ startDate: -1, createdAt: -1 })
    .lean();
}

async function getBookingDetail(id) {
  const booking = await Booking.findById(id)
    .populate(
      "customerId",
      "code name type status area contacts depositRequired",
    )
    .lean();

  if (!booking) {
    throw new AppError("Booking not found", 404, "NOT_FOUND");
  }

  const [ledgerEntries, payments, stockMovements] = await Promise.all([
    LedgerEntry.find({ bookingId: booking._id })
      .sort({ date: 1, createdAt: 1 })
      .lean(),
    Payment.find({ bookingId: booking._id }).sort({ paidDate: -1 }).lean(),
    StockMovement.find({ bookingId: booking._id })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const balance = calcBalance(ledgerEntries, payments);

  return {
    booking,
    balance,
    ledgerEntries,
    payments,
    stockMovements,
  };
}

async function createBooking(payload, user, req) {
  if (payload.endDate < payload.startDate) {
    throw new AppError(
      "endDate cannot be before startDate",
      400,
      "VALIDATION_ERROR",
    );
  }

  const customer = await Customer.findById(payload.customerId).lean();
  if (!customer || customer.archivedAt) {
    throw new AppError("Customer not found", 404, "NOT_FOUND");
  }

  // Block bookings for BLOCKED customers (Section 5.2)
  if (customer.status === "BLOCKED") {
    throw new AppError(
      "Customer is BLOCKED from creating new bookings",
      403,
      "CUSTOMER_BLOCKED",
    );
  }

  const warnings = [];
  if (customer.status === "WATCHLIST") {
    warnings.push("WATCHLIST_CUSTOMER");
  }

  const today = toBusinessDate();
  const [movements, activeBookings, settings] = await Promise.all([
    StockMovement.find({}).lean(),
    Booking.find({
      status: { $in: ["RESERVED", "OUT"] },
      startDate: { $lte: payload.endDate },
    }).lean(),
    getDefaultSettings(),
  ]);

  const availability = calcAvailabilityRange({
    movements,
    bookings: activeBookings,
    fromDate: payload.startDate,
    toDate: payload.endDate,
    today,
  });

  if (payload.qty > availability.minAvailable) {
    throw new AppError(
      `Insufficient chair stock for ${payload.startDate}..${payload.endDate}. Requested ${payload.qty}, minimum available ${availability.minAvailable}`,
      409,
      "INSUFFICIENT_STOCK",
    );
  }

  const ratePerChairPerDay =
    payload.ratePerChairPerDay ?? settings.ratePerChairPerDay;
  const lateFeePerDay = payload.lateFeePerDay ?? settings.lateFeePerDay;
  const graceDays = payload.graceDays ?? settings.graceDays;
  const code = await generateSequentialCode(Booking, "B", 4);

  const booking = await Booking.create({
    code,
    customerId: customer._id,
    status: "RESERVED",
    startDate: payload.startDate,
    endDate: payload.endDate,
    qty: payload.qty,
    qtyOut: 0,
    qtyReturned: 0,
    qtyLost: 0,
    qtyDamaged: 0,
    ratePerChairPerDay,
    lateFeePerDay,
    graceDays,
    depositHeld: payload.depositHeld || 0,
    venue: payload.venue || "",
    notes: payload.notes || "",
    createdBy: user?._id || null,
  });

  const hireEntries = buildInitialHireEntries({
    bookingId: booking._id,
    customerId: customer._id,
    qty: payload.qty,
    ratePerChairPerDay,
    startDate: payload.startDate,
    endDate: payload.endDate,
    createdBy: user?._id || null,
  });

  await LedgerEntry.insertMany(hireEntries);

  await writeAuditLog({
    userId: user?._id || null,
    action: "BOOKING_CREATED",
    entityType: "BOOKING",
    entityId: booking._id,
    after: {
      code: booking.code,
      customerId: customer._id,
      qty: booking.qty,
      startDate: booking.startDate,
      endDate: booking.endDate,
      ratePerChairPerDay,
    },
    req,
  });

  return { booking, warnings };
}

async function pickupBooking(id, payload, user, req) {
  const booking = await Booking.findById(id);
  if (!booking) {
    throw new AppError("Booking not found", 404, "NOT_FOUND");
  }
  if (booking.status !== "RESERVED") {
    throw new AppError(
      `Cannot pick up booking in ${booking.status} status`,
      400,
      "INVALID_TRANSITION",
    );
  }

  const pickupDate = payload.pickupDate || toBusinessDate();
  booking.status = "OUT";
  booking.qtyOut = booking.qty;
  booking.pickupDate = pickupDate;
  if (payload.notes) {
    booking.notes = booking.notes
      ? `${booking.notes}\n${payload.notes}`
      : payload.notes;
  }

  await booking.save();

  await writeAuditLog({
    userId: user?._id || null,
    action: "BOOKING_PICKED_UP",
    entityType: "BOOKING",
    entityId: booking._id,
    after: { status: booking.status, qtyOut: booking.qtyOut, pickupDate },
    req,
  });

  return booking;
}

async function returnBooking(id, payload, user, req) {
  const booking = await Booking.findById(id);
  if (!booking) {
    throw new AppError("Booking not found", 404, "NOT_FOUND");
  }
  if (booking.status !== "OUT") {
    throw new AppError(
      `Cannot process return for booking in ${booking.status} status`,
      400,
      "INVALID_TRANSITION",
    );
  }

  const accountedQty =
    payload.qtyReturned + payload.qtyLost + payload.qtyDamaged;
  if (accountedQty <= 0) {
    throw new AppError(
      "Return quantities must be greater than zero",
      400,
      "VALIDATION_ERROR",
    );
  }
  if (accountedQty > booking.qtyOut) {
    throw new AppError(
      `Accounted return quantity (${accountedQty}) exceeds chairs currently out (${booking.qtyOut})`,
      400,
      "VALIDATION_ERROR",
    );
  }

  const returnDate = payload.returnDate || toBusinessDate();
  booking.qtyReturned += payload.qtyReturned;
  booking.qtyLost += payload.qtyLost;
  booking.qtyDamaged += payload.qtyDamaged;
  booking.qtyOut -= accountedQty;

  if (booking.qtyOut === 0) {
    booking.status = "RETURNED";
    booking.returnedDate = returnDate;
  }

  if (payload.notes) {
    booking.notes = booking.notes
      ? `${booking.notes}\n${payload.notes}`
      : payload.notes;
  }

  await booking.save();

  // Record stock movements for lost or damaged chairs
  const movementDocs = [];
  if (payload.qtyLost > 0) {
    movementDocs.push({
      date: returnDate,
      type: "LOST",
      qty: payload.qtyLost,
      bookingId: booking._id,
      note: `Lost during booking ${booking.code}`,
      createdBy: user?._id || null,
    });
  }
  if (payload.qtyDamaged > 0) {
    movementDocs.push({
      date: returnDate,
      type: "DAMAGED",
      qty: payload.qtyDamaged,
      bookingId: booking._id,
      note: `Damaged during booking ${booking.code}`,
      createdBy: user?._id || null,
    });
  }
  if (movementDocs.length > 0) {
    await StockMovement.insertMany(movementDocs);
  }

  // Record ledger fees for lost or damaged chairs when fee per chair is specified
  const feeEntries = [];
  if (payload.qtyLost > 0 && payload.lossFeePerChair > 0) {
    feeEntries.push({
      bookingId: booking._id,
      customerId: booking.customerId,
      type: "LOSS_FEE",
      date: returnDate,
      dueDate: returnDate,
      qty: payload.qtyLost,
      unitAmount: payload.lossFeePerChair,
      amount: payload.qtyLost * payload.lossFeePerChair,
      description: `Loss fee for ${payload.qtyLost} chairs on ${booking.code}`,
      source: "RETURN",
      createdBy: user?._id || null,
    });
  }
  if (payload.qtyDamaged > 0 && payload.damageFeePerChair > 0) {
    feeEntries.push({
      bookingId: booking._id,
      customerId: booking.customerId,
      type: "DAMAGE_FEE",
      date: returnDate,
      dueDate: returnDate,
      qty: payload.qtyDamaged,
      unitAmount: payload.damageFeePerChair,
      amount: payload.qtyDamaged * payload.damageFeePerChair,
      description: `Damage fee for ${payload.qtyDamaged} chairs on ${booking.code}`,
      source: "RETURN",
      createdBy: user?._id || null,
    });
  }
  if (feeEntries.length > 0) {
    await LedgerEntry.insertMany(feeEntries);
  }

  await writeAuditLog({
    userId: user?._id || null,
    action: "BOOKING_RETURN_RECORDED",
    entityType: "BOOKING",
    entityId: booking._id,
    after: {
      status: booking.status,
      qtyReturned: payload.qtyReturned,
      qtyLost: payload.qtyLost,
      qtyDamaged: payload.qtyDamaged,
      qtyOutRemaining: booking.qtyOut,
      returnDate,
    },
    req,
  });

  return booking;
}

async function extendBooking(id, payload, user, req) {
  const booking = await Booking.findById(id);
  if (!booking) {
    throw new AppError("Booking not found", 404, "NOT_FOUND");
  }
  if (booking.status !== "RESERVED" && booking.status !== "OUT") {
    throw new AppError(
      `Cannot extend booking in ${booking.status} status`,
      400,
      "INVALID_TRANSITION",
    );
  }

  const requestedDate = payload.requestedDate || toBusinessDate();
  const activeQty = booking.status === "OUT" ? booking.qtyOut : booking.qty;
  const extFrom = addBusinessDays(booking.endDate, 1);
  const extTo = addBusinessDays(booking.endDate, payload.days);
  const today = toBusinessDate();

  const [movements, otherBookings] = await Promise.all([
    StockMovement.find({}).lean(),
    Booking.find({
      _id: { $ne: booking._id },
      status: { $in: ["RESERVED", "OUT"] },
      startDate: { $lte: extTo },
    }).lean(),
  ]);

  const availability = calcAvailabilityRange({
    movements,
    bookings: otherBookings,
    fromDate: extFrom,
    toDate: extTo,
    today,
  });

  if (activeQty > availability.minAvailable) {
    throw new AppError(
      `Insufficient stock to extend from ${extFrom} to ${extTo} for ${activeQty} chairs`,
      409,
      "INSUFFICIENT_STOCK",
    );
  }

  const ext = buildExtensionHireEntries({
    bookingId: booking._id,
    customerId: booking.customerId,
    qty: activeQty,
    ratePerChairPerDay: booking.ratePerChairPerDay,
    currentEndDate: booking.endDate,
    days: payload.days,
    requestedDate,
    createdBy: user?._id || null,
  });

  booking.endDate = ext.toDate;
  if (booking.status === "RESERVED") {
    booking.qty += activeQty;
  }
  booking.extensions.push({
    requestedDate,
    days: payload.days,
    newEndDate: ext.toDate,
    chargeTotal: ext.chargeTotal,
    notes: payload.notes || "",
    createdBy: user?._id || null,
  });

  await booking.save();
  await LedgerEntry.insertMany(ext.entries);

  await writeAuditLog({
    userId: user?._id || null,
    action: "BOOKING_EXTENDED",
    entityType: "BOOKING",
    entityId: booking._id,
    after: {
      days: payload.days,
      newEndDate: ext.toDate,
      chargeTotal: ext.chargeTotal,
      requestedDate,
    },
    req,
  });

  return { booking, chargeTotal: ext.chargeTotal };
}

async function cancelBooking(id, payload, user, req) {
  const booking = await Booking.findById(id);
  if (!booking) {
    throw new AppError("Booking not found", 404, "NOT_FOUND");
  }
  if (booking.status !== "RESERVED") {
    throw new AppError(
      `Only RESERVED bookings can be cancelled (current status: ${booking.status})`,
      400,
      "INVALID_TRANSITION",
    );
  }

  booking.status = "CANCELLED";
  if (payload.reason) {
    booking.notes = booking.notes
      ? `${booking.notes}\n[CANCELLED] ${payload.reason}`
      : `[CANCELLED] ${payload.reason}`;
  }
  await booking.save();

  // Void open hire ledger entries for this cancelled reservation
  await LedgerEntry.updateMany(
    { bookingId: booking._id, type: "HIRE", voidedAt: null },
    {
      $set: {
        voidedAt: new Date(),
        voidReason: payload.reason || "Booking cancelled",
        voidedBy: user?._id || null,
      },
    },
  );

  await writeAuditLog({
    userId: user?._id || null,
    action: "BOOKING_CANCELLED",
    entityType: "BOOKING",
    entityId: booking._id,
    after: { status: booking.status, reason: payload.reason },
    req,
  });

  return booking;
}

module.exports = {
  listBookings,
  getBookingDetail,
  createBooking,
  pickupBooking,
  returnBooking,
  extendBooking,
  cancelBooking,
};
