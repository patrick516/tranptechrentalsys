const LedgerEntry = require("../models/LedgerEntry");

async function findDuplicateIdempotencyKeys() {
  return LedgerEntry.aggregate([
    { $match: { idempotencyKey: { $ne: null } } },
    { $group: { _id: "$idempotencyKey", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
}

module.exports = { findDuplicateIdempotencyKeys };
