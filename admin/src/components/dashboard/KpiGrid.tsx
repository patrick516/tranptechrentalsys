import React from "react";
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

export default function KpiGrid({ kpi }: KpiGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        label="Available Today"
        value={kpi.availableToday}
        subtext={`of ${kpi.totalOwnedChairs} total owned`}
        accent="blue"
      />
      <StatsCard
        label="Chairs Out"
        value={kpi.chairsOut}
        subtext={`${kpi.activeOutCount} active • ${kpi.overdueBookingsCount} overdue`}
        accent="blue"
      />
      <StatsCard
        label="Net Receivable"
        value={formatMK(kpi.netReceivable)}
        subtext={`Paid today: ${formatMK(kpi.paymentsToday)}`}
        accent="green"
      />
      <StatsCard
        label="Due Promises / Watchlist"
        value={`${kpi.duePromisesCount} / ${kpi.watchlistCustomersCount + kpi.blockedCustomersCount}`}
        subtext={`${kpi.watchlistCustomersCount} watchlist • ${kpi.blockedCustomersCount} blocked`}
        accent="blue"
      />
    </div>
  );
}
