// Today: the actions that need doing right now — pickups, returns, promises
// due, failed messages and the money received today.
import { useEffect, useState } from "react";
import { AlertCircle, CalendarCheck, PhoneCall, RotateCcw, Send, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { formatMK, todayBlantyre } from "../../lib/format";
import Topbar from "../../components/layout/Topbar";
import Panel from "../../components/common/Panel";
import DataTable, { type Column } from "../../components/common/DataTable";
import { Button } from "@/components/ui/button";

interface BookingRow {
  _id: string;
  code: string;
  status: string;
  startDate: string;
  endDate: string;
  qty: number;
  qtyOut: number;
  customerId?: { code: string; name: string } | string;
}

interface PromiseRow {
  _id: string;
  kind: "PAYMENT" | "RETURN";
  promisedDate: string;
  promisedAmount?: number | null;
  status: string;
  customerId?: { code: string; name: string } | string;
}

interface MessageRow {
  _id: string;
  toPhone: string;
  channel: string;
  status: string;
  body: string;
}

interface PaymentRow {
  _id: string;
  paidDate: string;
  amount: number;
  method: string;
  customerId?: { code: string; name: string } | string;
}

function nameOf(c?: { code: string; name: string } | string): string {
  if (!c) return "–";
  if (typeof c === "string") return c;
  return `${c.code} · ${c.name}`;
}

export default function TodayPage() {
  const navigate = useNavigate();
  const today = todayBlantyre();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [promises, setPromises] = useState<PromiseRow[]>([]);
  const [failed, setFailed] = useState<MessageRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest<{ data: BookingRow[] }>("/bookings"),
      apiRequest<{ data: PromiseRow[] }>("/promises"),
      apiRequest<{ data: MessageRow[] }>("/messages?status=FAILED"),
      apiRequest<{ data: PaymentRow[] }>("/payments"),
    ])
      .then(([b, p, m, pay]) => {
        setBookings(b.data || []);
        setPromises(p.data || []);
        setFailed(m.data || []);
        setPayments(pay.data || []);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load today's work"),
      );
  }, []);

  const pickups = bookings.filter((b) => b.status === "RESERVED" && b.startDate <= today);
  const returns = bookings.filter((b) => b.status === "OUT" && b.endDate <= today);
  const overdue = bookings.filter((b) => b.status === "OUT" && b.endDate < today);
  const duePromises = promises.filter(
    (p) => p.status === "PENDING" && p.promisedDate <= today,
  );
  const paidToday = payments.filter((p) => p.paidDate === today);

  const pickupColumns: Column<BookingRow>[] = [
    { key: "code", header: "Booking", render: (d) => <span className="font-medium tabular-nums">{d.code}</span> },
    { key: "customer", header: "Customer", render: (d) => <span className="text-slate-600">{nameOf(d.customerId)}</span> },
    { key: "date", header: "Start", render: (d) => <span className="tabular-nums">{d.startDate}</span> },
    { key: "qty", header: "Chairs", align: "right", render: (d) => <span className="tabular-nums">{d.qty}</span> },
    {
      key: "open",
      header: "",
      align: "right",
      render: () => (
        <Button variant="outline" size="sm" onClick={() => navigate("/bookings")}>
          Open bookings
        </Button>
      ),
    },
  ];

  const returnColumns: Column<BookingRow>[] = [
    { key: "code", header: "Booking", render: (d) => <span className="font-medium tabular-nums">{d.code}</span> },
    { key: "customer", header: "Customer", render: (d) => <span className="text-slate-600">{nameOf(d.customerId)}</span> },
    { key: "due", header: "Due back", render: (d) => <span className="tabular-nums">{d.endDate}</span> },
    { key: "out", header: "Out", align: "right", render: (d) => <span className="tabular-nums">{d.qtyOut}</span> },
    {
      key: "late",
      header: "",
      align: "right",
      render: (d) =>
        d.endDate < today ? (
          <span className="text-xs font-semibold text-red-600">
            {Math.round((Date.parse(today) - Date.parse(d.endDate)) / 86400000)} days late
          </span>
        ) : (
          <span className="text-xs text-slate-500">due today</span>
        ),
    },
  ];

  const promiseColumns: Column<PromiseRow>[] = [
    { key: "customer", header: "Customer", render: (d) => <span className="font-medium">{nameOf(d.customerId)}</span> },
    { key: "kind", header: "Kind", render: (d) => <span className="text-slate-600">{d.kind}</span> },
    { key: "date", header: "Promised", render: (d) => <span className="tabular-nums">{d.promisedDate}</span> },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (d) => <span className="tabular-nums">{d.promisedAmount ? formatMK(d.promisedAmount) : "–"}</span>,
    },
  ];

  const paymentColumns: Column<PaymentRow>[] = [
    { key: "customer", header: "Customer", render: (d) => <span className="font-medium">{nameOf(d.customerId)}</span> },
    { key: "method", header: "Method", render: (d) => <span className="text-slate-600">{d.method}</span> },
    { key: "amount", header: "Amount", align: "right", render: (d) => <span className="font-semibold tabular-nums">{formatMK(d.amount)}</span> },
  ];

  return (
    <div>
      <Topbar
        title="Today"
        subtitle={`${today} · pickups, returns, promises and failed messages`}
        rightSlot={
          <>
            <Button variant="outline" onClick={() => navigate("/bookings")}>
              <CalendarCheck aria-hidden />
              Bookings
            </Button>
            <Button onClick={() => navigate("/payments")}>
              <Wallet aria-hidden />
              Record payment
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { icon: CalendarCheck, label: "Pickups due", value: pickups.length },
            { icon: RotateCcw, label: "Returns due", value: returns.length },
            { icon: PhoneCall, label: "Promises due", value: duePromises.length },
            { icon: Send, label: "Failed messages", value: failed.length },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-slate-500">
                <kpi.icon className="h-4 w-4" aria-hidden />
                <span className="text-sm">{kpi.label}</span>
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-brand-navy">{kpi.value}</p>
            </div>
          ))}
        </div>

        <Panel title={`Pickups to make (${pickups.length})`}>
          <DataTable
            caption="Bookings starting today or earlier"
            columns={pickupColumns}
            rows={pickups}
            rowKey={(d) => d._id}
            emptyText="No pickups due today."
          />
        </Panel>

        <Panel title={`Returns to collect (${returns.length})`} action={overdue.length > 0 ? `${overdue.length} overdue` : "All on time"}>
          <DataTable
            caption="Chairs due back today or earlier"
            columns={returnColumns}
            rows={returns}
            rowKey={(d) => d._id}
            emptyText="No returns due today."
          />
        </Panel>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title={`Promises due (${duePromises.length})`}>
            <DataTable
              caption="Customer promises falling due"
              columns={promiseColumns}
              rows={duePromises}
              rowKey={(d) => d._id}
              emptyText="No promises due."
            />
          </Panel>

          <Panel title={`Received today (${paidToday.length})`} action={formatMK(paidToday.reduce((s, p) => s + p.amount, 0))}>
            <DataTable
              caption="Payments received today"
              columns={paymentColumns}
              rows={paidToday}
              rowKey={(d) => d._id}
              emptyText="Nothing received yet today."
            />
          </Panel>
        </div>

        <Panel
          title={`Failed messages (${failed.length})`}
          action={
            <button
              type="button"
              onClick={() => navigate("/messages")}
              className="text-xs font-medium text-primary underline underline-offset-2"
            >
              Open messages
            </button>
          }
        >
          {failed.length === 0 ? (
            <p className="text-sm text-slate-500">No failed messages.</p>
          ) : (
            <ul className="space-y-2">
              {failed.map((m) => (
                <li key={m._id} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="tabular-nums text-slate-600">{m.toPhone}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{m.channel}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-600">{m.body}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
