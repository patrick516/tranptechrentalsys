// Operations dashboard displaying live KPIs, chair availability chart, and debtors table
import React, { useEffect, useState, useCallback } from "react";
import { apiRequest } from "../../api/client";
import { formatMK, todayBlantyre } from "../../lib/format";
import type { AdminNavId } from "../../layouts/AdminLayout";
import KpiGrid, {
  type DashboardKpiData,
} from "../../components/dashboard/KpiGrid";
import Chart, { type BarDatum } from "../../components/common/Chart";

interface DebtorRow {
  customerId: string;
  code: string;
  name: string;
  status: string;
  primaryPhone?: string;
  balance: number;
}

interface DashboardPageProps {
  onNavigate?: (tab: AdminNavId) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [kpi, setKpi] = useState<DashboardKpiData | null>(null);
  const [debtors, setDebtors] = useState<DebtorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobRunning, setJobRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [kpiRes, debtorsRes] = await Promise.all([
        apiRequest<{ data: DashboardKpiData }>("/reports/dashboard"),
        apiRequest<{ data: DebtorRow[] }>("/reports/debtors"),
      ]);
      setKpi(kpiRes.data);
      setDebtors(debtorsRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleRunDailyJob() {
    setJobRunning(true);
    setMessage("");
    setError("");
    try {
      const res = await apiRequest<{
        data: { businessDate: string; overdueChargedCount: number };
      }>("/reports/run-daily-job", {
        method: "POST",
        body: { businessDate: todayBlantyre() },
      });
      setMessage(
        `Daily ledger job completed for ${res.data.businessDate} (${res.data.overdueChargedCount} overdue charges posted).`,
      );
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Daily job failed");
    } finally {
      setJobRunning(false);
    }
  }

  const stockChartItems: BarDatum[] = kpi
    ? [
        { label: "Total Owned", value: kpi.totalOwnedChairs },
        { label: "Available Today", value: kpi.availableToday },
        { label: "Chairs Out", value: kpi.chairsOut },
      ]
    : [];

  const debtorChartItems: BarDatum[] = debtors.slice(0, 5).map((d) => ({
    label: `${d.code} (${d.name})`,
    value: d.balance,
  }));

  return (
    <div className="space-y-6 font-sans text-brand-navy">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">
            Operations Dashboard
          </h1>
          <p className="text-sm text-brand-navy/75">
            Business Date: {kpi?.businessDate || todayBlantyre()}{" "}
            (Africa/Blantyre)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.("bookings")}
            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy"
          >
            New Booking
          </button>
          <button
            type="button"
            onClick={handleRunDailyJob}
            disabled={jobRunning}
            className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-50"
          >
            {jobRunning ? "Running Job..." : "Run Daily Ledger Job"}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-md border border-brand-green bg-brand-green px-4 py-2.5 text-sm font-medium text-white">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-brand-navy bg-brand-navy px-4 py-2.5 text-sm text-white">
          {error}
        </div>
      )}

      {loading && !kpi ? (
        <div className="rounded-lg border border-brand-blue p-6 text-sm text-brand-navy">
          Loading dashboard metrics...
        </div>
      ) : (
        kpi && <KpiGrid kpi={kpi} />
      )}

      {/* Visual Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Chart title="Chair Stock Allocation" items={stockChartItems} />
        <Chart title="Top Outstanding Balances (MK)" items={debtorChartItems} />
      </div>

      {/* Debtors Table */}
      <div className="rounded-lg border border-brand-blue bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-brand-navy">
            Outstanding Balances
          </h2>
          <span className="text-xs font-semibold text-brand-blue">
            {debtors.length} customer(s) with balance
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-brand-blue/30 text-xs font-semibold text-brand-blue">
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Phone</th>
                <th className="py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {debtors.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 text-center text-brand-navy/70"
                  >
                    No outstanding balances.
                  </td>
                </tr>
              ) : (
                debtors.map((d) => (
                  <tr
                    key={d.customerId}
                    className="border-b border-brand-blue/15"
                  >
                    <td className="py-2.5 pr-3 font-mono text-xs">{d.code}</td>
                    <td className="py-2.5 pr-3 font-semibold text-brand-navy">
                      {d.name}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">{d.status}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">
                      {d.primaryPhone || "-"}
                    </td>
                    <td className="py-2.5 text-right font-bold text-brand-blue">
                      {formatMK(d.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
