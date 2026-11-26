// Reports service computing outstanding customer balances (debtors)
const Customer = require("../models/Customer");
const LedgerEntry = require("../models/LedgerEntry");
const Payment = require("../models/Payment");
const { calcBalance } = require("./ledger.calc");

async function getDebtorsList(minBalance = 1) {
  const [customers, entries, payments] = await Promise.all([
    Customer.find({ archivedAt: null }).lean(),
    LedgerEntry.find({}).lean(),
    Payment.find({}).lean(),
  ]);

  const entriesByCustomer = new Map();
  for (const e of entries) {
    const k = String(e.customerId);
    if (!entriesByCustomer.has(k)) entriesByCustomer.set(k, []);
    entriesByCustomer.get(k).push(e);
  }

  const paymentsByCustomer = new Map();
  for (const p of payments) {
    const k = String(p.customerId);
    if (!paymentsByCustomer.has(k)) paymentsByCustomer.set(k, []);
    paymentsByCustomer.get(k).push(p);
  }

  return customers
    .map((c) => {
      const k = String(c._id);
      const balance = calcBalance(
        entriesByCustomer.get(k) || [],
        paymentsByCustomer.get(k) || [],
      );
      const primaryContact =
        c.contacts?.find((ct) => ct.isPrimary) || c.contacts?.[0] || null;
      return {
        customerId: c._id,
        code: c.code,
        name: c.name,
        status: c.status,
        primaryPhone: primaryContact?.phone || "",
        balance,
      };
    })
    .filter((row) => row.balance >= minBalance)
    .sort((a, b) => b.balance - a.balance);
}

module.exports = { getDebtorsList };
