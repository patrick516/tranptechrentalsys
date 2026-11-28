import { useEffect, useState, useCallback } from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { apiRequest, apiDownload } from "../../api/client";
import { formatMK, todayBlantyre } from "../../lib/format";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Topbar from "../../components/layout/Topbar";
import Panel from "../../components/common/Panel";
import StatsCard from "../../components/common/StatsCard";
import DataTable, { type Column } from "../../components/common/DataTable";
import PeriodFilter from "../../components/common/PeriodFilter";
import { defaultPeriodValue, type PeriodValue } from "../../components/common/period";
import SelectField from "../../components/forms/SelectField";
import { TrendChart, BarsChart, DonutChart, type Series } from "../../components/charts";

interface Point {
  date: string;
  value: number;
}

interface SummaryData {
  from: string;
  to: string;
  charges: number;
  payments: number;
  net: number;
  bookingsCreated: number;
  bookingsCompleted: number;
  bookingsCancelled: number;
  newCustomers: number;
  avgBookingValue: number;
  overdueBookings: number;
  outstandingBalance: number;
}

interface TrendsData {
  series: Record<string, Point[]>;
}

interface AgeingBucket {
  key: string;
  label: string;
  customers: number;
  total: number;
}

interface DebtorRow {
  customerId: string;
  code: string;
  name: string;
  status: string;
  balance: number;
  daysOverdue: number;
  dueDate: string;
  bookingCodes: string[];
}

interface AgeingData {
  buckets: AgeingBucket[];
  topDebtors: DebtorRow[];
  totalOutstanding: number;
  debtorCount: number;
}

interface CollectionsData {
  total: number;
  count: number;
  byMonth: { month: string; total: number; count: number }[];
  byMethod: { method: string; total: number; count: number }[];
  payments: {
    id: string;
    date: string;
    method: string;
    amount: number;
    reference: string;
    customerName: string;
    customerCode: string;
    bookingCode: string;
  }[];
}

interface UtilisationData {
  days: number;
  totalOwned: number;
  capacityChairDays: number;
  usedChairDays: number;
  utilisationPercent: number;
  byDay: { date: string; available: number; out: number; percent: number }[];
  byBooking: {
    bookingCode: string;
    customerName: string;
    chairs: number;
    days: number;
    chairDays: number;
  }[];
}

const METHOD_LABELS: Record<string, string> = {
  AIRTEL_MONEY: "Airtel Money",
  MPAMBA: "Mpamba",
  CASH: "Cash",
  BANK: "Bank",
  OTHER: "Other",
};

const EXPORTS = [
  { value: "summary", label: "Period summary" },
  { value: "debtors", label: "Debtors list" },
  { value: "ageing", label: "Ageing report" },
  { value: "collections", label: "Collections" },
  { value: "utilisation", label: "Utilisation" },
  { value: "payments", label: "Payments" },
  { value: "bookings", label: "Bookings" },
];


function series(points: Point[], id: string): Series {
  return { id, data: points.map((p) => ({ x: p.date, y: p.value || 0 })) };
}

export default function ReportsPage() {
  const today = todayBlantyre();
  const [period, setPeriod] = useState<PeriodValue>(() =>
    defaultPeriodValue(today),
  );
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [ageing, setAgeing] = useState<AgeingData | null>(null);
  const [collections, setCollections] = useState<CollectionsData | null>(null);
  const [utilisation, setUtilisation] = useState<UtilisationData | null>(null);
  const [exportName, setExportName] = useState("summary");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const range = `from=${encodeURIComponent(period.from)}&to=${encodeURIComponent(period.to)}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sumRes, trendRes, ageRes, colRes, utilRes] = await Promise.all([
        apiRequest<{ data: SummaryData }>(`/reports/summary?${range}`),
        apiRequest<{ data: TrendsData }>(`/reports/trends?${range}`),
        apiRequest<{ data: AgeingData }>("/reports/ageing"),
        apiRequest<{ data: CollectionsData }>(`/reports/collections?${range}`),
        apiRequest<{ data: UtilisationData }>(`/reports/utilisation?${range}`),
      ]);
      setSummary(sumRes.data);
      setTrends(trendRes.data);
      setAgeing(ageRes.data);
      setCollections(colRes.data);
      setUtilisation(utilRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      await apiDownload(
        `/reports/export?report=${exportName}&${range}`,
        `${exportName}_${period.from}_${period.to}.csv`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const s = trends?.series;

  const moneySeries: Series[] = s
    ? [series(s.chargesCumulative, "Charged"), series(s.paymentsCumulative, "Received")]
    : [];
  const balanceSeries: Series[] = s ? [series(s.balanceCumulative, "Balance")] : [];
  const chairsSeries: Series[] = s ? [series(s.chairsOut, "Chairs out")] : [];
  const bookingsDaily = (s?.bookingsCreated || []).map((p) => ({
    label: p.date.slice(5),
    value: p.value,
  }));

  const debtorColumns: Column<DebtorRow>[] = [
    {
      key: "code",
      header: "Code",
      render: (d) => <span className="tabular-nums">{d.code}</span>,
    },
    { key: "name", header: "Customer", render: (d) => <span className="font-medium">{d.name}</span> },
    { key: "bookings", header: "Bookings", render: (d) => <span className="text-xs text-slate-500">{(d.bookingCodes || []).join(", ") || "–"}</span> },
    {
      key: "days",
      header: "Days late",
      align: "right",
      render: (d) => (
        <span className={d.daysOverdue > 30 ? "font-semibold text-red-600 tabular-nums" : "tabular-nums"}>
          {d.daysOverdue > 0 ? d.daysOverdue : "–"}
        </span>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      render: (d) => <span className="font-semibold tabular-nums">{formatMK(d.balance)}</span>,
    },
  ];

  const paymentColumns: Column<CollectionsData["payments"][number]>[] = [
    { key: "date", header: "Date", render: (d) => <span className="tabular-nums">{d.date}</span> },
    { key: "customer", header: "Customer", render: (d) => <span className="font-medium">{d.customerName || "–"}</span> },
    { key: "method", header: "Method", render: (d) => <span className="text-slate-600">{METHOD_LABELS[d.method] || d.method}</span> },
    { key: "booking", header: "Booking", render: (d) => <span className="tabular-nums text-slate-600">{d.bookingCode || "–"}</span> },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (d) => <span className="font-semibold tabular-nums">{formatMK(d.amount)}</span>,
    },
  ];

  const utilisationColumns: Column<UtilisationData["byBooking"][number]>[] = [
    { key: "code", header: "Booking", render: (d) => <span className="tabular-nums">{d.bookingCode}</span> },
    { key: "customer", header: "Customer", render: (d) => <span className="font-medium">{d.customerName || "–"}</span> },
    { key: "chairs", header: "Chairs", align: "right", render: (d) => <span className="tabular-nums">{d.chairs}</span> },
    { key: "days", header: "Days", align: "right", render: (d) => <span className="tabular-nums">{d.days}</span> },
    {
      key: "chairDays",
      header: "Chair-days",
      align: "right",
      render: (d) => <span className="font-semibold tabular-nums">{d.chairDays}</span>,
    },
  ];

  return (
    <div>
      <Topbar
        title="Reports"
        subtitle={`Ageing, collections, utilisation and exports · ${period.from} → ${period.to}`}
        rightSlot={
          <div className="flex flex-wrap items-end gap-2">
            <PeriodFilter value={period} onChange={setPeriod} today={today} />
            <SelectField
              id="export-report"
              label="Export"
              value={exportName}
              onValueChange={setExportName}
              options={EXPORTS}
              className="w-48"
            />
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Download aria-hidden />
              )}
              {exporting ? "Preparing…" : "Download CSV"}
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        {loading && !summary && (
          <div role="status" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <span className="sr-only">Loading reports…</span>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} aria-hidden className="animate-pulse rounded-lg border border-slate-200 p-5">
                <div className="h-3 w-28 rounded bg-slate-100" />
                <div className="mt-4 h-7 w-32 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ageing">Ageing</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="utilisation">Utilisation</TabsTrigger>
          </TabsList>

          {/* ---------------- Overview ---------------- */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard label="Charged in period" value={formatMK(summary?.charges || 0)} subtext={`${summary?.bookingsCreated ?? 0} bookings created`} />
              <StatsCard label="Received in period" value={formatMK(summary?.payments || 0)} subtext={`${summary?.newCustomers ?? 0} new customers`} />
              <StatsCard label="Net for period" value={formatMK(summary?.net || 0)} subtext={`Average booking ${formatMK(summary?.avgBookingValue || 0)}`} />
              <StatsCard
                label="Outstanding (all time)"
                value={formatMK(summary?.outstandingBalance || 0)}
                subtext={`${summary?.overdueBookings ?? 0} overdue right now`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Panel title="Charged against received (cumulative)">
                <TrendChart series={moneySeries} formatValue={(v) => formatMK(v)} />
              </Panel>
              <Panel title="Outstanding balance (cumulative)">
                <TrendChart series={balanceSeries} formatValue={(v) => formatMK(v)} />
              </Panel>
              <Panel title="New bookings per day">
                <BarsChart data={bookingsDaily} height={260} />
              </Panel>
              <Panel title="Chairs out per day">
                <TrendChart series={chairsSeries} height={260} />
              </Panel>
            </div>
          </TabsContent>

          {/* ---------------- Ageing ---------------- */}
          <TabsContent value="ageing" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {(ageing?.buckets || []).map((b) => (
                <StatsCard
                  key={b.key}
                  label={b.label}
                  value={formatMK(b.total)}
                  subtext={`${b.customers} customer${b.customers === 1 ? "" : "s"}`}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Panel title="Share of money owed">
                <DonutChart
                  data={(ageing?.buckets || [])
                    .filter((b) => b.total > 0)
                    .map((b) => ({ id: b.label, value: b.total }))}
                  formatValue={(v) => formatMK(v)}
                />
              </Panel>
              <Panel
                title="Oldest unpaid balances"
                className="xl:col-span-2"
                action={`${ageing?.debtorCount ?? 0} debtors · ${formatMK(ageing?.totalOutstanding || 0)} owed`}
              >
                <DataTable
                  caption="Customers with an outstanding balance, oldest first"
                  columns={debtorColumns}
                  rows={ageing?.topDebtors || []}
                  rowKey={(d) => d.customerId}
                  emptyText="No outstanding balances."
                />
              </Panel>
            </div>
          </TabsContent>

          {/* ---------------- Collections ---------------- */}
          <TabsContent value="collections" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatsCard label="Received in period" value={formatMK(collections?.total || 0)} />
              <StatsCard label="Payments" value={collections?.count ?? 0} />
              <StatsCard
                label="Best month"
                value={
                  (collections?.byMonth || []).length > 0
                    ? formatMK(
                        Math.max(...(collections?.byMonth || []).map((m) => m.total)),
                      )
                    : "–"
                }
                subtext={
                  (collections?.byMonth || []).find(
                    (m) =>
                      m.total ===
                      Math.max(...(collections?.byMonth || []).map((x) => x.total)),
                  )?.month
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Panel title="Collections by month">
                <BarsChart
                  data={(collections?.byMonth || []).map((m) => ({
                    label: m.month,
                    value: m.total,
                  }))}
                  formatValue={(v) => formatMK(v)}
                  color="#005098"
                />
              </Panel>
              <Panel title="Collections by method">
                <DonutChart
                  data={(collections?.byMethod || []).map((m) => ({
                    id: METHOD_LABELS[m.method] || m.method,
                    value: m.total,
                  }))}
                  formatValue={(v) => formatMK(v)}
                />
              </Panel>
            </div>

            <Panel title="Payments in period" action={`${collections?.payments.length ?? 0} shown`}>
              <DataTable
                caption="Payments received in the selected period"
                columns={paymentColumns}
                rows={collections?.payments || []}
                rowKey={(d) => d.id}
                emptyText="No payments in this period."
              />
            </Panel>
          </TabsContent>

          {/* ---------------- Utilisation ---------------- */}
          <TabsContent value="utilisation" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard label="Utilisation" value={`${utilisation?.utilisationPercent ?? 0}%`} subtext="chair-days used against owned" />
              <StatsCard label="Chair-days used" value={(utilisation?.usedChairDays ?? 0).toLocaleString("en-US")} />
              <StatsCard label="Chair-days available" value={(utilisation?.capacityChairDays ?? 0).toLocaleString("en-US")} subtext={`${utilisation?.totalOwned ?? 0} chairs × ${utilisation?.days ?? 0} days`} />
              <StatsCard label="Days measured" value={utilisation?.days ?? 0} />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Panel title="Chairs out against capacity" className="xl:col-span-2">
                <TrendChart
                  series={[
                    {
                      id: "Chairs out",
                      data: (utilisation?.byDay || []).map((d) => ({
                        x: d.date,
                        y: d.out,
                      })),
                    },
                    {
                      id: "Owned",
                      data: (utilisation?.byDay || []).map((d) => ({
                        x: d.date,
                        y: d.available,
                      })),
                    },
                  ]}
                  height={280}
                />
              </Panel>
              <Panel title="Busiest bookings (chair-days)">
                <DataTable
                  caption="Bookings using the most chair-days"
                  columns={utilisationColumns}
                  rows={utilisation?.byBooking || []}
                  rowKey={(d) => d.bookingCode}
                  emptyText="No bookings in this period."
                />
              </Panel>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
