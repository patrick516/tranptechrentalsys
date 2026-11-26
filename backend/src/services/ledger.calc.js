const { assertWholeKwacha, calcDailyHireCharge } = require("../utils/money");
const {
  addBusinessDays,
  listBusinessDatesInclusive,
} = require("../utils/dates");

// Builds initial daily HIRE ledger entries for a booking [startDate, endDate] inclusive.
// All initial HIRE entries carry dueDate = startDate and idempotencyKey = HIRE:<bookingId>:<date>.
function buildInitialHireEntries({
  bookingId,
  customerId,
  qty,
  ratePerChairPerDay,
  startDate,
  endDate,
  createdBy = null,
}) {
  assertWholeKwacha(qty, "qty");
  if (qty <= 0) {
    throw new Error("qty must be greater than zero");
  }
  assertWholeKwacha(ratePerChairPerDay, "ratePerChairPerDay");

  const dates = listBusinessDatesInclusive(startDate, endDate);
  if (dates.length === 0) {
    throw new Error("endDate cannot be before startDate");
  }

  const dailyAmount = calcDailyHireCharge(ratePerChairPerDay, qty);

  return dates.map((date) => ({
    bookingId,
    customerId,
    type: "HIRE",
    date,
    dueDate: startDate,
    qty,
    unitAmount: ratePerChairPerDay,
    amount: dailyAmount,
    description: `Chair hire (${qty} chairs) for ${date}`,
    source: "SYSTEM",
    idempotencyKey: `HIRE:${bookingId}:${date}`,
    reason: "",
    voidedAt: null,
    createdBy,
  }));
}

// Builds extension HIRE ledger entries starting the day after currentEndDate for `days`.
// Each extension entry has dueDate = requestedDate so unpaid balances become past due that day.
function buildExtensionHireEntries({
  bookingId,
  customerId,
  qty,
  ratePerChairPerDay,
  currentEndDate,
  days,
  requestedDate,
  createdBy = null,
}) {
  assertWholeKwacha(qty, "qty");
  assertWholeKwacha(ratePerChairPerDay, "ratePerChairPerDay");
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error("days must be a positive integer");
  }

  const fromDate = addBusinessDays(currentEndDate, 1);
  const toDate = addBusinessDays(currentEndDate, days);
  const dates = listBusinessDatesInclusive(fromDate, toDate);
  const dailyAmount = calcDailyHireCharge(ratePerChairPerDay, qty);

  const entries = dates.map((date) => ({
    bookingId,
    customerId,
    type: "HIRE",
    date,
    dueDate: requestedDate,
    qty,
    unitAmount: ratePerChairPerDay,
    amount: dailyAmount,
    description: `Extension hire (${qty} chairs) for ${date}`,
    source: "SYSTEM",
    idempotencyKey: `HIRE:${bookingId}:${date}`,
    reason: "",
    voidedAt: null,
    createdBy,
  }));

  return {
    fromDate,
    toDate,
    chargeTotal: dailyAmount * dates.length,
    entries,
  };
}

// Sums valid (non-voided) ledger entries
function calcChargesTotal(ledgerEntries = []) {
  return ledgerEntries
    .filter((e) => !e.voidedAt)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

// Sums valid (CONFIRMED) payments
function calcPaymentsTotal(payments = []) {
  return payments
    .filter((p) => p.status === "CONFIRMED")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

// Computes current balance: chargesTotal - paymentsTotal
// Positive = customer owes money; negative = customer credit
function calcBalance(ledgerEntries = [], payments = []) {
  return calcChargesTotal(ledgerEntries) - calcPaymentsTotal(payments);
}

// Computes past-due principal on business date D:
// max(0, sum(non-voided non-LATE_FEE charges with dueDate <= D) - sum(CONFIRMED payments with paidDate <= D))
function calcPrincipalDueOnDate(
  ledgerEntries = [],
  payments = [],
  businessDate,
) {
  const principalCharges = ledgerEntries
    .filter(
      (e) => !e.voidedAt && e.type !== "LATE_FEE" && e.dueDate <= businessDate,
    )
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const paymentsUpToDate = payments
    .filter((p) => p.status === "CONFIRMED" && p.paidDate <= businessDate)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return Math.max(0, principalCharges - paymentsUpToDate);
}

// Determines late fee for business date D given graceDays and earliest dueDate among past-due entries.
// Returns lateFeePerDay if past-due principal > 0 and grace period has elapsed; otherwise 0.
function calcLateFeeForDate({
  ledgerEntries = [],
  payments = [],
  businessDate,
  lateFeePerDay,
  graceDays = 0,
}) {
  assertWholeKwacha(lateFeePerDay, "lateFeePerDay");
  const grace = Math.max(0, Number(graceDays) || 0);

  const principalDue = calcPrincipalDueOnDate(
    ledgerEntries,
    payments,
    businessDate,
  );
  if (principalDue <= 0) {
    return 0;
  }

  // Find earliest unpaid non-fee entry due on or before businessDate to measure grace days
  const candidateEntries = ledgerEntries.filter(
    (e) => !e.voidedAt && e.type !== "LATE_FEE" && e.dueDate <= businessDate,
  );

  if (candidateEntries.length === 0) {
    return 0;
  }

  const earliestDueDate = candidateEntries.map((e) => e.dueDate).sort()[0];

  // Grace period starts after dueDate: grace=0 means late fee applies from dueDate itself
  const firstEligibleDate = addBusinessDays(earliestDueDate, grace);
  if (businessDate < firstEligibleDate) {
    return 0;
  }

  return lateFeePerDay;
}

// Pure step for a single business date D in the daily job:
// 1. Overstay HIRE for date D when qtyOut > 0 and endDate < D
// 2. LATE_FEE for previous date P = addBusinessDays(D, -1) when principalDue(P) > 0 after grace
function evaluateDailyLedgerForDate({
  booking,
  ledgerEntries = [],
  payments = [],
  businessDate,
  existingKeys = new Set(),
}) {
  const newEntries = [];
  const keys = new Set(existingKeys);

  // 1. Overstay hire on date D if chairs remain out past endDate
  const qtyOut = Number(booking.qtyOut) || 0;
  if (
    booking.status === "OUT" &&
    qtyOut > 0 &&
    booking.endDate < businessDate
  ) {
    const hireKey = `HIRE:${booking._id || booking.id}:${businessDate}`;
    if (!keys.has(hireKey)) {
      const rate = Number(booking.ratePerChairPerDay) || 0;
      const amount = calcDailyHireCharge(rate, qtyOut);
      keys.add(hireKey);
      newEntries.push({
        bookingId: booking._id || booking.id,
        customerId: booking.customerId,
        type: "HIRE",
        date: businessDate,
        dueDate: businessDate,
        qty: qtyOut,
        unitAmount: rate,
        amount,
        description: `Overstay hire (${qtyOut} chairs) for ${businessDate}`,
        source: "SYSTEM",
        idempotencyKey: hireKey,
        reason: "",
        voidedAt: null,
      });
    }
  }

  // 2. Late fee for previous business date P = D - 1
  const prevDate = addBusinessDays(businessDate, -1);
  const allEntriesWithPending = [...ledgerEntries, ...newEntries];
  const feeKey = `LATE_FEE:${booking._id || booking.id}:${prevDate}`;

  if (!keys.has(feeKey)) {
    const feeAmount = calcLateFeeForDate({
      ledgerEntries: allEntriesWithPending,
      payments,
      businessDate: prevDate,
      lateFeePerDay: Number(booking.lateFeePerDay) || 0,
      graceDays: Number(booking.graceDays) || 0,
    });

    if (feeAmount > 0) {
      keys.add(feeKey);
      newEntries.push({
        bookingId: booking._id || booking.id,
        customerId: booking.customerId,
        type: "LATE_FEE",
        date: prevDate,
        dueDate: prevDate,
        qty: 1,
        unitAmount: feeAmount,
        amount: feeAmount,
        description: `Late fee for ${prevDate}`,
        source: "SYSTEM",
        idempotencyKey: feeKey,
        reason: "",
        voidedAt: null,
      });
    }
  }

  return newEntries;
}

module.exports = {
  buildInitialHireEntries,
  buildExtensionHireEntries,
  calcChargesTotal,
  calcPaymentsTotal,
  calcBalance,
  calcPrincipalDueOnDate,
  calcLateFeeForDate,
  evaluateDailyLedgerForDate,
};
