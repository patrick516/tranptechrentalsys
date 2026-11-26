// Pure stock availability calculations per Section 7.5 (no DB queries inside pure math)
const { listBusinessDatesInclusive } = require("../utils/dates");

const ADDITIVE_TYPES = new Set(["PURCHASE", "FOUND", "REPAIRED"]);
const SUBTRACTIVE_TYPES = new Set(["LOST", "DAMAGED", "WRITE_OFF"]);

// Computes net total chairs owned from stock movement records
function calcTotalOwned(movements = []) {
  let total = 0;
  for (const m of movements) {
    const qty = Number(m.qty) || 0;
    if (ADDITIVE_TYPES.has(m.type)) {
      total += qty;
    } else if (SUBTRACTIVE_TYPES.has(m.type)) {
      total -= qty;
    }
  }
  return Math.max(0, total);
}

// Effective end date for a booking on business date `today`:
// Overdue open bookings hold chairs until max(endDate, today)
function getEffectiveEndDate(booking, today) {
  const isOpen = booking.status === "RESERVED" || booking.status === "OUT";
  if (isOpen && booking.status === "OUT" && today > booking.endDate) {
    return today > booking.endDate ? today : booking.endDate;
  }
  return booking.endDate;
}

// Computes daily availability across [fromDate, toDate] inclusive
function calcAvailabilityRange({
  movements = [],
  bookings = [],
  fromDate,
  toDate,
  today,
  unavailableQty = 0,
}) {
  const totalOwned = calcTotalOwned(movements);
  const dates = listBusinessDatesInclusive(fromDate, toDate);

  const days = dates.map((day) => {
    let reservedOrOut = 0;
    for (const b of bookings) {
      if (b.status !== "RESERVED" && b.status !== "OUT") continue;
      const effEnd = getEffectiveEndDate(b, today);
      if (b.startDate <= day && day <= effEnd) {
        const activeQty =
          typeof b.qtyOut === "number" && b.status === "OUT" ? b.qtyOut : b.qty;
        reservedOrOut += Number(activeQty) || 0;
      }
    }

    const available = Math.max(
      0,
      totalOwned - (Number(unavailableQty) || 0) - reservedOrOut,
    );
    return {
      date: day,
      totalOwned,
      reservedOrOut,
      available,
    };
  });

  const minAvailable = days.reduce(
    (min, d) => Math.min(min, d.available),
    totalOwned,
  );
  return {
    totalOwned,
    fromDate,
    toDate,
    minAvailable,
    days,
  };
}

module.exports = {
  calcTotalOwned,
  getEffectiveEndDate,
  calcAvailabilityRange,
};
