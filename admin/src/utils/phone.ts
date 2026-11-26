export function normalizeMalawiPhone(raw: string = ""): string {
  const digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("265") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10)
    return `+265${digits.slice(1)}`;
  if (digits.length === 9) return `+265${digits}`;
  return String(raw).trim();
}
