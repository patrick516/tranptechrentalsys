export function formatMK(amount: number = 0): string {
  const num = Number(amount) || 0;
  const sign = num < 0 ? "-" : "";
  const abs = Math.round(Math.abs(num)).toLocaleString("en-US");
  return `${sign}MK ${abs}`;
}
