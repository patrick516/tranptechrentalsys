// Payment service for recording payments and looking up customer payment history
const Payment = require("../models/Payment");
const { toBusinessDate } = require("../utils/dates");

async function recordPayment({
  customerId,
  bookingId = null,
  amount,
  paidDate,
  method,
  reference = "",
  notes = "",
  userId,
}) {
  return Payment.create({
    customerId,
    bookingId,
    amount,
    paidDate: paidDate || toBusinessDate(),
    method,
    reference,
    notes,
    status: "CONFIRMED",
    createdBy: userId,
  });
}

async function listPayments(filter = {}) {
  return Payment.find(filter)
    .populate("customerId", "code name")
    .sort({ paidDate: -1, createdAt: -1 })
    .lean();
}

module.exports = { recordPayment, listPayments };
