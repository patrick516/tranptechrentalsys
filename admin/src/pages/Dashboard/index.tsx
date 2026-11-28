import { useEffect, useState, useCallback, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { formatMK, todayBlantyre } from "../../lib/format";
import { Button } from "@/components/ui/button";
import Topbar from "../../components/layout/Topbar";
import Panel from "../../components/common/Panel";
import PeriodFilter from "../../components/common/PeriodFilter";
import { defaultPeriodValue, type PeriodValue } from "../../components/common/period";
import KpiGrid, {
  KpiGridSkeleton,
  type DashboardKpiData,
} from "../../components/dashboard/KpiGrid";
import Chart, { type BarDatum } from "../../components/common/Chart";
import DataTable, { type Column } from "../../components/common/DataTable";
import StatsCard from "../../components/common/StatsCard";
import CustomerStatus from "../../components/customers/CustomerStatus";
import {
  TrendChart,
  BarsChart,
  type Series,
} from "../../components/charts";

interface DebtorRow {
  customerId: string;
  code: string;
  name: string;
  status: string;
  primaryPhone?: string;
  balance: number;
}

interface Point {
  date: string;
  value: number;
}

interface TrendsResponse {
  from: string;
  to: string;
  days: string[];
  series: Record<string, Point[]>;
}

interface SummaryResponse {
  from: string;
  to: string;
  charges: number;
  payments: number;
  net: number;
  bookingsCreated: number;
  bookingsCompleted: number;
  newCustomers: number;
  outstandingBalance: number;
}

const debtorColumns: Column<DebtorRow>[] = [
  {
    key: "code",
    header: "Code",
    render: (d) => <span className="font-medium tabular-nums">{d.code}</span>,
  },
  {
    key: "name",
    header: "Customer",
    render: (d) => <span className="font-medium">{d.name}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (d) => <CustomerStatus status={d.status} />,
  },
  {
    key: "phone",
    header: "Phone",
    render: (d) => (
      <span className="tabular-nums text-slate-600">{d.primaryPhone || "–"}</span>
    ),
  },
  {
    key: "balance",
    header: "Balance",
    align: "right",
    render: (d) => (
      <span className="font-semibold tabular-nums">{formatMK(d.balance)}</span>
    ),
  },
];

function toSeries(points: Point[], id: string): Series {
  return {
    id,
    data: points.map((p) => ({ x: p.date, y: Number(p.value) || 0 })),
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const today = todayBlantyre();
  const [period, setPeriod] = useState<PeriodValue>(() =>
    defaultPeriodValue(today),
  );
  const [kpi, setKpi] = useState<DashboardKpiData | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [debtors, setDebtors] = useState<DebtorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobRunning, setJobRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const range = useMemo(() => {
    const params = `from=${encodeURIComponent(period.from)}&to=${encodeURIComponent(period.to)}`;
    return params;
  }, [period]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [kpiRes, debtorsRes, trendsRes, summaryRes] = await Promise.all([
        apiRequest<{ data: DashboardKpiData }>("/reports/dashboard"),
        apiRequest<{ data: DebtorRow[] }>("/reports/debtors"),
        apiRequest<{ data: TrendsResponse }>(`/reports/trends?${range}`),
        apiRequest<{ data: SummaryResponse }>(`/reports/summary?${range}`),
      ]);
      setKpi(kpiRes.data);
      setDebtors(debtorsRes.data || []);
      setTrends(trendsRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [range]);

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
        body: { businessDate: today },
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
        { label: "Total owned", value: kpi.totalOwnedChairs },
        { label: "Available today", value: kpi.availableToday },
        { label: "Chairs out", value: kpi.chairsOut },
      ]
    : [];

  const debtorChartItems: BarDatum[] = debtors.slice(0, 5).map((d) => ({
    label: `${d.code} · ${d.name}`,
    value: d.balance,
  }));

  const s = trends?.series;
  const moneySeries: Series[] = s
    ? [
        toSeries(s.chargesCumulative, "Charged"),
        toSeries(s.paymentsCumulative, "Received"),
      ]
    : [];
  const balanceSeries: Series[] = s ? [toSeries(s.balanceCumulative, "Balance")] : [];
  const chairsSeries: Series[] = s ? [toSeries(s.chairsOut, "Chairs out")] : [];
  const paymentsDaily: BarDatum[] = (s?.payments || []).map((p) => ({
    label: p.date.slice(5),
    value: p.value,
  }));
  const bookingsDaily: BarDatum[] = (s?.bookingsCreated || []).map((p) => ({
    label: p.date.slice(5),
    value: p.value,
  }));
  const overdueSeries: Series[] = s ? [toSeries(s.overdueCount, "Overdue bookings")] : [];

  return (
    <div>
      <Topbar
        title="Operations dashboard"
        subtitle={`Business date ${kpi?.businessDate || today} · Africa/Blantyre`}
        rightSlot={
          <>
            <PeriodFilter value={period} onChange={setPeriod} today={today} />
            <Button
              variant="outline"
              onClick={handleRunDailyJob}
              disabled={jobRunning}
            >
              {jobRunning ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <RefreshCw aria-hidden />
              )}
              {jobRunning ? "Running job…" : "Run daily ledger job"}
            </Button>
            <Button onClick={() => navigate("/bookings")}>
              <Plus aria-hidden />
              New booking
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        {message && (
          <p role="status" className="flex items-start gap-2 text-sm text-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {message}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="flex flex-wrap items-start gap-x-2 text-sm text-red-600"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
            {!kpi && (
              <button
                type="button"
                onClick={loadDashboard}
                className="font-medium underline underline-offset-2"
              >
                Try again
              </button>
            )}
          </p>
        )}

        {loading && !kpi ? (
          <KpiGridSkeleton />
        ) : (
          kpi && <KpiGrid kpi={kpi} />
        )}

        {/* Range summary: how the selected period performed */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label={`Charged ${period.from} → ${period.to}`}
            value={formatMK(summary?.charges || 0)}
            subtext={`${summary?.bookingsCreated ?? 0} bookings created`}
          />
          <StatsCard
            label="Received in period"
            value={formatMK(summary?.payments || 0)}
            subtext={`${summary?.newCustomers ?? 0} new customers`}
          />
          <StatsCard
            label="Net for the period"
            value={formatMK(summary?.net || 0)}
            subtext={
              (summary?.net || 0) > 0 ? "More charged than received" : "More received than charged"
            }
          />
          <StatsCard
            label="Completed bookings"
            value={summary?.bookingsCompleted ?? 0}
            subtext={`${summary?.bookingsCreated ?? 0} created in the same period`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel
            title="Money: charged against received (cumulative)"
            action={`${period.from} → ${period.to}`}
          >
            <TrendChart series={moneySeries} formatValue={(v) => formatMK(v)} />
          </Panel>

          <Panel
            title="Outstanding balance over time (cumulative)"
            action={`${period.from} → ${period.to}`}
          >
            <TrendChart series={balanceSeries} formatValue={(v) => formatMK(v)} />
          </Panel>

          <Panel title="Chairs out per day">
            <TrendChart series={chairsSeries} height={260} />
          </Panel>

          <Panel title="Payments received per day">
            <BarsChart
              data={paymentsDaily}
              formatValue={(v) => formatMK(v)}
              height={260}
              color="#289030"
            />
          </Panel>

          <Panel title="New bookings per day">
            <BarsChart data={bookingsDaily} height={260} />
          </Panel>

          <Panel title="Overdue bookings per day">
            <TrendChart series={overdueSeries} height={260} />
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Chart title="Chair stock today" items={stockChartItems} />
          <Chart
            title="Top outstanding balances"
            items={debtorChartItems}
            formatValue={formatMK}
            emptyText="No outstanding balances."
          />
        </div>

        <Panel
          title="Outstanding balances"
          action={`${debtors.length} customer${debtors.length === 1 ? "" : "s"} with a balance`}
        >
          <DataTable
            caption="Customers with an outstanding balance"
            columns={debtorColumns}
            rows={debtors}
            rowKey={(d) => d.customerId}
            emptyText="No outstanding balances."
          />
        </Panel>
      </div>
    </div>
  );
}
