// Small helpers for the booking dialogs. They only drive the on-screen
// preview: the server always works out the real dates and charges.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

// "2026-11-30" + 2 -> "2026-12-02". Returns "" for an invalid date.
export function addDays(date: string, days: number): string {
  if (!DATE_PATTERN.test(date)) return "";
  return new Date(toUtc(date) + days * 86400000).toISOString().slice(0, 10);
}

// Number of hire days from start to end, both included. 0 if a date is invalid.
export function daysInclusive(start: string, end: string): number {
  if (!DATE_PATTERN.test(start) || !DATE_PATTERN.test(end)) return 0;
  return Math.round((toUtc(end) - toUtc(start)) / 86400000) + 1;
}

// "12" -> 12. Anything that is not a whole number (including "") -> null.
export function toWholeNumber(text: string): number | null {
  return /^\d+$/.test(text.trim()) ? Number(text) : null;
}

export function isBusinessDateText(text: string): boolean {
  return DATE_PATTERN.test(text);
}
