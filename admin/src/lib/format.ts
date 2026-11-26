// Formats whole Malawi Kwacha amounts and Africa/Blantyre dates for UI display
export function formatMK(amount: number = 0): string {
  const num = Number(amount) || 0;
  const sign = num < 0 ? "-" : "";
  const abs = Math.round(Math.abs(num)).toLocaleString("en-US");
  return `${sign}MK ${abs}`;
}

export function todayBlantyre(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Blantyre",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
