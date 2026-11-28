// Date-range helpers shared by the dashboard and reports. Kept out of the
// PeriodFilter component so the file only exports components (fast refresh).
export type Period = "week" | "month" | "quarter" | "custom";

export interface PeriodValue {
  period: Period;
  from: string;
  to: string;
}

function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function defaultPeriodValue(today: string): PeriodValue {
  return { period: "month", from: `${today.slice(0, 7)}-01`, to: today };
}

export function rangeFor(
  period: Period,
  today: string,
  from?: string,
  to?: string,
): PeriodValue {
  if (period === "week") return { period, from: shiftDays(today, -6), to: today };
  if (period === "month") return { period, from: `${today.slice(0, 7)}-01`, to: today };
  if (period === "quarter") return { period, from: shiftDays(today, -89), to: today };
  return { period: "custom", from: from || shiftDays(today, -29), to: to || today };
}
