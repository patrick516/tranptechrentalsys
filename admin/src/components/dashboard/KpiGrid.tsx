import type { ReactNode } from "react";
import StatsCard from "../common/StatsCard";
import { formatMK } from "../../utils/money";

export interface DashboardKpiData {
  businessDate?: string;
  totalOwnedChairs: number;
  availableToday: number;
  chairsOut: number;
  activeOutCount: number;
  overdueBookingsCount: number;
  netReceivable: number;
  paymentsToday: number;
  duePromisesCount: number;
  watchlistCustomersCount: number;
  blockedCustomersCount: number;
}

interface KpiGridProps {
  kpi: DashboardKpiData;
}

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4";

// Shows "2 overdue" in red when there is something to act on, plain text otherwise.
function flag(count: number, text: string): ReactNode {
  return count > 0 ? (
    <span className="font-medium text-red-600">
      {count} {text}
    </span>
  ) : (
    `${count} ${text}`
  );
}

export default function KpiGrid({ kpi }: KpiGridProps) {
  return (
    <div className={GRID}>
      <StatsCard
        label="Available today"
        value={kpi.availableToday}
        subtext={`of ${kpi.totalOwnedChairs} total owned`}
      />
      <StatsCard
        label="Chairs out"
        value={kpi.chairsOut}
        subtext={<>{kpi.activeOutCount} active &middot; {flag(kpi.overdueBookingsCount, "overdue")}</>}
      />
      <StatsCard
        label="Net receivable"
        value={formatMK(kpi.netReceivable)}
        subtext={`Paid today: ${formatMK(kpi.paymentsToday)}`}
      />
      <StatsCard
        label="Due promises / watchlist"
        value={`${kpi.duePromisesCount} / ${kpi.watchlistCustomersCount + kpi.blockedCustomersCount}`}
        subtext={<>{kpi.watchlistCustomersCount} watchlist &middot; {flag(kpi.blockedCustomersCount, "blocked")}</>}
      />
    </div>
  );
}

// Grey placeholder shown while the numbers load.
export function KpiGridSkeleton() {
  return (
    <div className={GRID} role="status">
      <span className="sr-only">Loading dashboard figures…</span>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} aria-hidden className="animate-pulse rounded-lg border border-slate-200 p-5">
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="mt-4 h-7 w-20 rounded bg-slate-100" />
          <div className="mt-3 h-3 w-32 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
