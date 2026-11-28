// Payments & ledger: record customer money and post manual adjustments or waivers.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Receipt } from "lucide-react";
import { apiRequest } from "../../api/client";
import { formatMK, todayBlantyre } from "../../lib/format";
import Topbar from "../../components/layout/Topbar";
import Panel from "../../components/common/Panel";
import DataTable, { type Column } from "../../components/common/DataTable";
import SelectField from "../../components/forms/SelectField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerOption {
  _id: string;
  code: string;
  name: string;
}

interface PaymentRow {
  _id: string;
  paidDate: string;
  amount: number;
  method: string;
  reference: string;
  status: "CONFIRMED" | "VOID";
  customerId?: CustomerOption | string;
}

interface LedgerRow {
  _id: string;
  date: string;
  dueDate: string;
  type: string;
  amount: number;
  description: string;
  reason: string;
  voidedAt?: string | null;
  customerId?: CustomerOption | string;
}

const METHODS = ["AIRTEL_MONEY", "MPAMBA", "CASH", "BANK", "OTHER"];

export default function PaymentsPage() {
  const today = todayBlantyre();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const [payCustomerId, setPayCustomerId] = useState("");
  const [payAmount, setPayAmount] = useState(20000);
  const [payMethod, setPayMethod] = useState("AIRTEL_MONEY");
  const [payReference, setPayReference] = useState("");

  const [adjCustomerId, setAdjCustomerId] = useState("");
  const [adjAmount, setAdjAmount] = useState(-2000);
  const [adjReason, setAdjReason] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [custRes, payRes, ledRes] = await Promise.all([
        apiRequest<{ data: CustomerOption[] }>("/customers"),
        apiRequest<{ data: PaymentRow[] }>("/payments"),
        apiRequest<{ data: LedgerRow[] }>("/ledger"),
      ]);
      const custs = custRes.data || [];
      setCustomers(custs);
      setPayments(payRes.data || []);
      setLedger(ledRes.data || []);
      if (custs.length > 0) {
        setPayCustomerId((prev) => prev || custs[0]._id);
        setAdjCustomerId((prev) => prev || custs[0]._id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments and ledger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleRecordPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback("");
    setError("");
    try {
      await apiRequest("/payments", {
        method: "POST",
        body: {
          customerId: payCustomerId,
          amount: Number(payAmount),
          paidDate: today,
          method: payMethod,
          reference: payReference,
        },
      });
      setFeedback(`Recorded payment of ${formatMK(Number(payAmount))}.`);
      setPayReference("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    }
  }

  async function handleRecordAdjustment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback("");
    setError("");
    try {
      await apiRequest("/ledger/adjustments", {
        method: "POST",
        body: {
          customerId: adjCustomerId,
          type: "ADJUSTMENT",
          amount: Number(adjAmount),
          date: today,
          dueDate: today,
          reason: adjReason,
        },
      });
      setFeedback(`Posted ledger adjustment of ${formatMK(Number(adjAmount))}.`);
      setAdjReason("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record adjustment");
    }
  }

  function custLabel(c?: CustomerOption | string): string {
    if (!c) return "–";
    if (typeof c === "string") return c;
    return `${c.code} · ${c.name}`;
  }

  const customerOptions = customers.map((c) => ({
    value: c._id,
    label: `${c.code} — ${c.name}`,
  }));

  const paymentColumns: Column<PaymentRow>[] = [
    { key: "paidDate", header: "Date", render: (d) => <span className="tabular-nums text-slate-600">{d.paidDate}</span> },
    { key: "customer", header: "Customer", render: (d) => <span className="font-medium">{custLabel(d.customerId)}</span> },
    { key: "method", header: "Method", render: (d) => <span className="text-slate-600">{d.method}</span> },
    { key: "reference", header: "Reference", render: (d) => <span className="tabular-nums text-slate-500">{d.reference || "–"}</span> },
    { key: "amount", header: "Amount", align: "right", render: (d) => <span className="font-semibold tabular-nums">{formatMK(d.amount)}</span> },
  ];

  const ledgerColumns: Column<LedgerRow>[] = [
    { key: "date", header: "Date", render: (d) => <span className="tabular-nums text-slate-600">{d.date}</span> },
    { key: "customer", header: "Customer", render: (d) => <span className="font-medium">{custLabel(d.customerId)}</span> },
    { key: "type", header: "Type", render: (d) => <span className="text-slate-600">{d.type}</span> },
    { key: "description", header: "Reason", render: (d) => <span className="text-slate-600">{d.description || d.reason || "–"}</span> },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (d) => (
        <span className={`font-semibold tabular-nums ${d.amount < 0 ? "text-red-600" : ""}`}>
          {formatMK(d.amount)}
        </span>
      ),
    },
  ];

  const todayTotal = payments.filter((p) => p.paidDate === today).reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <Topbar
        title="Payments & ledger"
        subtitle="Record money received and post adjustments or fee waivers"
        rightSlot={
          <span className="text-sm text-slate-500">
            Today: <span className="font-semibold text-slate-900 tabular-nums">{formatMK(todayTotal)}</span>
          </span>
        }
      />

      <div className="space-y-6">
        {feedback && (
          <p role="status" className="flex items-start gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {feedback}
          </p>
        )}
        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel title="Record payment" action={<Receipt className="h-4 w-4 text-slate-400" aria-hidden />}>
            <form onSubmit={handleRecordPayment} className="space-y-4 p-5">
              <SelectField
                id="payCustomer"
                label="Customer"
                value={payCustomerId}
                onValueChange={setPayCustomerId}
                placeholder={customerOptions.length ? undefined : "No customers yet"}
                options={customerOptions}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="payAmount">Amount (MK)</Label>
                  <Input
                    id="payAmount"
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                  />
                </div>
                <SelectField
                  id="payMethod"
                  label="Method"
                  value={payMethod}
                  onValueChange={setPayMethod}
                  options={METHODS.map((m) => ({ value: m, label: m }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payRef">Reference / receipt</Label>
                <Input
                  id="payRef"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="Transaction ID or receipt number"
                />
              </div>
              <Button type="submit" disabled={!payCustomerId || payAmount <= 0}>
                Save payment
              </Button>
            </form>
          </Panel>

          <Panel title="Adjustment / fee waiver" action="Negative amounts reduce the balance">
            <form onSubmit={handleRecordAdjustment} className="space-y-4 p-5">
              <SelectField
                id="adjCustomer"
                label="Customer"
                value={adjCustomerId}
                onValueChange={setAdjCustomerId}
                placeholder={customerOptions.length ? undefined : "No customers yet"}
                options={customerOptions}
              />
              <div className="space-y-2">
                <Label htmlFor="adjAmount">Amount (e.g. -8000)</Label>
                <Input
                  id="adjAmount"
                  type="number"
                  step={1}
                  required
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjReason">Reason</Label>
                <Input
                  id="adjReason"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. goodwill late fee waiver"
                />
              </div>
              <Button type="submit" variant="outline" disabled={!adjCustomerId || !adjReason.trim()}>
                Post adjustment
              </Button>
            </form>
          </Panel>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading history…</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Panel title="Recent payments" action={`${payments.length} total`}>
              <DataTable
                caption="Payments recorded"
                columns={paymentColumns}
                rows={payments.slice(0, 20)}
                rowKey={(d) => d._id}
                emptyText="No payments recorded yet."
              />
            </Panel>

            <Panel title="Recent ledger entries" action={`${ledger.length} total`}>
              <DataTable
                caption="Manual ledger movements"
                columns={ledgerColumns}
                rows={ledger.slice(0, 20)}
                rowKey={(d) => d._id}
                emptyText="No manual ledger entries yet."
              />
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
