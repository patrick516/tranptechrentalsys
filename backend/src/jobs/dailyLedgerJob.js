// Idempotent daily ledger job posting overstay HIRE and past-due LATE_FEE entries in Africa/Blantyre
const Booking = require("../models/Booking");
const LedgerEntry = require("../models/LedgerEntry");
const Payment = require("../models/Payment");
const JobRun = require("../models/JobRun");
const { toBusinessDate } = require("../utils/dates");
const { evaluateDailyLedgerForDate } = require("../services/ledger.calc");

async function runDailyLedgerJob(targetDate = null) {
  const businessDate = targetDate || toBusinessDate();

  const jobRun = await JobRun.create({
    jobName: "dailyLedgerJob",
    businessDate,
    status: "RUNNING",
    startedAt: new Date(),
  });

  try {
    const outBookings = await Booking.find({ status: "OUT" }).lean();
    const bookingIds = outBookings.map((b) => b._id);

    const [allEntries, allPayments] = await Promise.all([
      bookingIds.length > 0
        ? LedgerEntry.find({ bookingId: { $in: bookingIds } }).lean()
        : Promise.resolve([]),
      bookingIds.length > 0
        ? Payment.find({
            bookingId: { $in: bookingIds },
            status: "CONFIRMED",
          }).lean()
        : Promise.resolve([]),
    ]);

    const entriesByBooking = new Map();
    const existingKeys = new Set();

    for (const entry of allEntries) {
      if (entry.idempotencyKey) {
        existingKeys.add(entry.idempotencyKey);
      }
      const key = String(entry.bookingId);
      if (!entriesByBooking.has(key)) entriesByBooking.set(key, []);
      entriesByBooking.get(key).push(entry);
    }

    const paymentsByBooking = new Map();
    for (const payment of allPayments) {
      const key = String(payment.bookingId);
      if (!paymentsByBooking.has(key)) paymentsByBooking.set(key, []);
      paymentsByBooking.get(key).push(payment);
    }

    const toInsert = [];
    let overstayHireCount = 0;
    let lateFeeCount = 0;

    for (const booking of outBookings) {
      const bKey = String(booking._id);
      const bEntries = entriesByBooking.get(bKey) || [];
      const bPayments = paymentsByBooking.get(bKey) || [];

      const created = evaluateDailyLedgerForDate({
        booking,
        ledgerEntries: bEntries,
        payments: bPayments,
        businessDate,
        existingKeys,
      });

      for (const item of created) {
        existingKeys.add(item.idempotencyKey);
        toInsert.push(item);
        if (item.type === "HIRE") overstayHireCount += 1;
        if (item.type === "LATE_FEE") lateFeeCount += 1;
      }
    }

    if (toInsert.length > 0) {
      await LedgerEntry.insertMany(toInsert, { ordered: false }).catch(
        (err) => {
          // Ignore duplicate key errors (code 11000) to guarantee idempotency across retries
          if (
            err?.code !== 11000 &&
            !err?.writeErrors?.every((e) => e.code === 11000)
          ) {
            throw err;
          }
        },
      );
    }

    const summary = {
      businessDate,
      evaluatedBookings: outBookings.length,
      insertedEntries: toInsert.length,
      overstayHireCount,
      lateFeeCount,
    };

    jobRun.status = "COMPLETED";
    jobRun.summary = summary;
    jobRun.finishedAt = new Date();
    await jobRun.save();

    return jobRun.toObject();
  } catch (err) {
    jobRun.status = "FAILED";
    jobRun.error = err.message || "Unknown daily ledger job error";
    jobRun.finishedAt = new Date();
    await jobRun.save();
    throw err;
  }
}

module.exports = { runDailyLedgerJob };
