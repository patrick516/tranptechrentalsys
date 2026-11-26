// Promises service for creating and updating payment/return commitments
const PromiseModel = require("../models/Promise");
const { toBusinessDate } = require("../utils/dates");

async function listPromises({ customerId, status, overdue } = {}) {
  const filter = {};
  if (customerId) filter.customerId = customerId;
  if (status) filter.status = status;
  if (overdue === true || overdue === "true") {
    filter.status = "PENDING";
    filter.promisedDate = { $lte: toBusinessDate() };
  }
  return PromiseModel.find(filter)
    .populate("customerId", "code name")
    .populate("bookingId", "code status")
    .sort({ promisedDate: 1, createdAt: -1 })
    .lean();
}

async function createPromise(payload, userId) {
  return PromiseModel.create({
    ...payload,
    status: "PENDING",
    createdBy: userId,
  });
}

async function updatePromiseStatus(id, status) {
  return PromiseModel.findByIdAndUpdate(
    id,
    { $set: { status } },
    { returnDocument: "after" },
  );
}

module.exports = { listPromises, createPromise, updatePromiseStatus };
