const BUSINESS_TZ = "Africa/Blantyre";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Converts a Date/ISO string/timestamp into a YYYY-MM-DD business date in Africa/Blantyre
function toBusinessDate(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date supplied to toBusinessDate");
  }

  // en-CA formats reliably as YYYY-MM-DD in the target timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

// Parses a YYYY-MM-DD string into a UTC midnight anchor for safe day arithmetic
function parseBusinessDateUtc(yyyyMmDd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) {
    throw new Error(`Invalid business date format: ${yyyyMmDd}`);
  }
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Adds `days` to a YYYY-MM-DD business date and returns YYYY-MM-DD
function addBusinessDays(yyyyMmDd, days) {
  const utcMs =
    parseBusinessDateUtc(yyyyMmDd).getTime() + Number(days) * MS_PER_DAY;
  return new Date(utcMs).toISOString().slice(0, 10);
}

// Returns whole days from `startDate` to `endDate` (inclusive count is diffDays(start, end) + 1)
function diffBusinessDays(startDate, endDate) {
  const a = parseBusinessDateUtc(startDate).getTime();
  const b = parseBusinessDateUtc(endDate).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

// Lists every YYYY-MM-DD business date from `startDate` through `endDate` inclusive
function listBusinessDatesInclusive(startDate, endDate) {
  const totalDays = diffBusinessDays(startDate, endDate);
  if (totalDays < 0) return [];
  const dates = [];
  for (let i = 0; i <= totalDays; i += 1) {
    dates.push(addBusinessDays(startDate, i));
  }
  return dates;
}

module.exports = {
  BUSINESS_TZ,
  MS_PER_DAY,
  toBusinessDate,
  parseBusinessDateUtc,
  addBusinessDays,
  diffBusinessDays,
  listBusinessDatesInclusive,
};
