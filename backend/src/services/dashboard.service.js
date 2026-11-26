// Aggregates dashboard KPIs for a given Africa/Blantyre business date
const Booking = require("../models/Booking");
const Customer = require("../models/Customer");
const LedgerEntry = require("../models/LedgerEntry");
const Payment = require("../models/Payment");
const StockMovement = require("../models/StockMovement");
const PromiseModel = require("../models/Promise");
const { toBusinessDate } = require("../utils/dates");
const { calcAvailabilityRange } = require("./stock");

async function getDashboardSummary(targetDate = null) {
  const businessDate = targetDate || toBusinessDate();

  const [
    movements,
    activeBookings,
    allLedger,
    allPayments,
    pendingPromises,
    watchlistCustomersCount,
    blockedCustomersCount,
  ] = await Promise.all([
    StockMovement.find({}).lean(),
    Booking.find({ status: { $in: ["RESERVED", "OUT"] } }).lean(),
    LedgerEntry.find({ voidedAt: null }).lean(),
    Payment.find({ status: "CONFIRMED" }).lean(),
    PromiseModel.find({
      status: "PENDING",
      promisedDate: { $lte: businessDate },
    }).lean(),
    Customer.countDocuments({ archivedAt: null, status: "WATCHLIST" }),
    Customer.countDocuments({ archivedAt: null, status: "BLOCKED" }),
  ]);

  const availabilityToday = calcAvailabilityRange({
    movements,
    bookings: activeBookings,
    fromDate: businessDate,
    toDate: businessDate,
    today: businessDate,
  });

  const outBookings = activeBookings.filter((b) => b.status === "OUT");
  const overdueBookings = outBookings.filter((b) => b.endDate < businessDate);
  const chairsOut = outBookings.reduce(
    (sum, b) => sum + (Number(b.qtyOut) || 0),
    0,
  );
  const reservedBookingsCount = activeBookings.filter(
    (b) => b.status === "RESERVED",
  ).length;

  const totalCharges = allLedger.reduce(
    (s, e) => s + (Number(e.amount) || 0),
    0,
  );
  const totalPayments = allPayments.reduce(
    (s, p) => s + (Number(p.amount) || 0),
    0,
  );
  const netReceivable = totalCharges - totalPayments;

  const paymentsToday = allPayments
    .filter((p) => p.paidDate === businessDate)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  return {
    businessDate,
    totalOwnedChairs: availabilityToday.totalOwned,
    availableToday: availabilityToday.minAvailable,
    chairsOut,
    reservedBookingsCount,
    activeOutCount: outBookings.length,
    overdueBookingsCount: overdueBookings.length,
    netReceivable,
    paymentsToday,
    duePromisesCount: pendingPromises.length,
    watchlistCustomersCount,
    blockedCustomersCount,
  };
}

module.exports = { getDashboardSummary };
