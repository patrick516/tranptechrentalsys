function assertWholeKwacha(amount, label = "amount") {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`${label} must be a non-negative integer in kwacha`);
  }
  return amount;
}

// Calculates daily hire charge: ratePerChairPerDay * qty
function calcDailyHireCharge(ratePerChairPerDay, qty) {
  assertWholeKwacha(ratePerChairPerDay, "ratePerChairPerDay");
  assertWholeKwacha(qty, "qty");
  return ratePerChairPerDay * qty;
}

// Formats whole kwacha for display, e.g. 400000 -> "MK 400,000" (Section 14)
function formatKwacha(amount) {
  const value = Number.isInteger(amount)
    ? amount
    : Math.round(Number(amount) || 0);
  return `MK ${value.toLocaleString("en-US")}`;
}

module.exports = {
  assertWholeKwacha,
  calcDailyHireCharge,
  formatKwacha,
};
