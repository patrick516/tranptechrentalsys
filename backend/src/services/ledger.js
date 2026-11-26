// Ledger service wrapping balance queries and manual adjustments
const LedgerEntry = require("../models/LedgerEntry");
const Payment = require("../models/Payment");
const { calcBalance } = require("./ledger.calc");
const { toBusinessDate } = require("../utils/dates");

async function getCustomerBalance(customerId) {
  const [entries, payments] = await Promise.all([
    LedgerEntry.find({ customerId }).lean(),
    Payment.find({ customerId }).lean(),
  ]);
  return calcBalance(entries, payments);
}

async function createManualAdjustment({
  customerId,
  bookingId = null,
  type = "ADJUSTMENT",
  amount,
  date,
  dueDate,
  reason,
  userId,
}) {
  const bizDate = date || toBusinessDate();
  return LedgerEntry.create({
    customerId,
    bookingId,
    date: bizDate,
    dueDate: dueDate || bizDate,
    type,
    amount,
    description: reason,
    reason,
    createdBy: userId,
  });
}

module.exports = { getCustomerBalance, createManualAdjustment };
