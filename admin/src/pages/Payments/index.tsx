// Payments & ledger: record customer money and post manual adjustments or waivers.
// Picking a customer shows what they owe and pre-fills the payment amount with it.
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

interface BalanceSummary {
  charged: number;
  paid: number;
  balance: number;
}

const METHODS = ["AIRTEL_MONEY", "MPAMBA", "CASH", "BANK", "OTHER"];
const DEFAULT_METHOD = "AIRTEL_MONEY";

export default function PaymentsPage() {
  const today = todayBlantyre();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const [payCustomerId, setPayCustomerId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState(DEFAULT_METHOD);
  const [payReference, setPayReference] = useState("");
  const [saving, setSaving] = useState(false);

  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [balanceTick, setBalanceTick] = useState(0); // bump to re-fetch + re-fill

  const [adjCustomerId, setAdjCustomerId] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjDirection, setAdjDirection] = useState<"LESS" | "MORE">("LESS");
  const [adjReason, setAdjReason] = useState("");
  const [adjSaving, setAdjSaving] = useState(false);

  const loadAll = useCallback(async () => {
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
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load payments and ledger",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Fetch the selected customer's balance and pre-fill the amount with what
  // they owe. Runs when the customer changes or after a save (balanceTick).
  useEffect(() => {
    if (!payCustomerId) return;
    let cancelled = false;
    apiRequest<{ data: BalanceSummary }>(`/ledger/balance/${payCustomerId}`)
      .then((res) => {
        if (cancelled) return;
        setBalance(res.data);
        setPayAmount(res.data.balance > 0 ? String(res.data.balance) : "");
      })
      .catch(() => {
        if (cancelled) return;
        setBalance(null);
        setPayAmount("");
      });
    return () => {
      cancelled = true;
    };
  }, [payCustomerId, balanceTick]);

  async function handleRecordPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    const amount = Number(payAmount);
    setFeedback("");
    setError("");
    setSaving(true);
    try {
      await apiRequest("/payments", {
        method: "POST",
        body: {
          customerId: payCustomerId,
          amount,
          paidDate: today,
          method: payMethod,
          reference: payReference.trim(),
        },
      });
      setFeedback(`Recorded payment of ${formatMK(amount)}.`);
      // Reset the form; the balance refresh below re-fills the amount with
      // whatever is still owing.
      setPayReference("");
      setPayMethod(DEFAULT_METHOD);
      setPayAmount("");
      setBalanceTick((t) => t + 1);
      void loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  }

  async function handleRecordAdjustment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (adjSaving) return;
    const entered = Math.abs(Number(adjAmount));
    const amount = adjDirection === "LESS" ? -entered : entered;
    setFeedback("");
    setError("");
    setAdjSaving(true);
    try {
      await apiRequest("/ledger/adjustments", {
        method: "POST",
        body: {
          customerId: adjCustomerId,
          type: "ADJUSTMENT",
          amount,
          date: today,
          dueDate: today,
          reason: adjReason.trim(),
        },
      });
      setFeedback(
        adjDirection === "LESS"
          ? `Reduced the balance by ${formatMK(entered)}.`
          : `Increased the balance by ${formatMK(entered)}.`,
      );
      setAdjAmount("");
      setAdjReason("");
      setBalanceTick((t) => t + 1);
      void loadAll();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to record adjustment",
      );
    } finally {
      setAdjSaving(false);
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
    {
      key: "paidDate",
      header: "Date",
      render: (d) => (
        <span className="tabular-nums text-slate-600">{d.paidDate}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (d) => (
        <span className="font-medium">{custLabel(d.customerId)}</span>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (d) => <span className="text-slate-600">{d.method}</span>,
    },
    {
      key: "reference",
      header: "Reference",
      render: (d) => (
        <span className="tabular-nums text-slate-500">
          {d.reference || "–"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (d) => (
        <span className="font-semibold tabular-nums">{formatMK(d.amount)}</span>
      ),
    },
  ];

  const ledgerColumns: Column<LedgerRow>[] = [
    {
      key: "date",
      header: "Date",
      render: (d) => (
        <span className="tabular-nums text-slate-600">{d.date}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (d) => (
        <span className="font-medium">{custLabel(d.customerId)}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (d) => <span className="text-slate-600">{d.type}</span>,
    },
    {
      key: "description",
      header: "Reason",
      render: (d) => (
        <span className="text-slate-600">
          {d.description || d.reason || "–"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (d) => (
        <span
          className={`font-semibold tabular-nums ${d.amount < 0 ? "text-red-600" : ""}`}
        >
          {formatMK(d.amount)}
        </span>
      ),
    },
  ];

  const todayTotal = payments
    .filter((p) => p.paidDate === today && p.status === "CONFIRMED")
    .reduce((s, p) => s + p.amount, 0);

  const payAmountNumber = Number(payAmount);
  const payValid = Number.isInteger(payAmountNumber) && payAmountNumber > 0;
  const adjAmountNumber = Number(adjAmount);
  const adjValid = Number.isInteger(adjAmountNumber) && adjAmountNumber > 0;

  return (
    <div>
      <Topbar
        title="Payments & ledger"
        subtitle="Record money received and post adjustments or fee waivers"
        rightSlot={
          <span className="text-sm text-slate-500">
            Today:{" "}
            <span className="font-semibold text-slate-900 tabular-nums">
              {formatMK(todayTotal)}
            </span>
          </span>
        }
      />

      <div className="space-y-6">
        {feedback && (
          <p
            role="status"
            className="flex items-start gap-2 text-sm text-emerald-700"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {feedback}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 text-sm text-red-600"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel
            title="Record payment"
            action={<Receipt className="h-4 w-4 text-slate-400" aria-hidden />}
          >
            <form onSubmit={handleRecordPayment} className="space-y-4 p-5">
              <SelectField
                id="payCustomer"
                label="Customer"
                value={payCustomerId}
                onValueChange={setPayCustomerId}
                placeholder={
                  customerOptions.length ? undefined : "No customers yet"
                }
                options={customerOptions}
              />

              {balance && (
                <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Charged</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatMK(balance.charged)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Paid</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatMK(balance.paid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">
                      {balance.balance < 0 ? "In credit" : "Owing"}
                    </p>
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        balance.balance > 0
                          ? "text-red-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {formatMK(Math.abs(balance.balance))}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="payAmount">Amount (MK)</Label>
                  <Input
                    id="payAmount"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder={
                      balance && balance.balance <= 0
                        ? "Nothing owing"
                        : undefined
                    }
                  />
                  {balance && balance.balance > 0 && (
                    <p className="text-xs text-slate-500">
                      Pre-filled with the amount owing. Edit it for a part
                      payment.
                    </p>
                  )}
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
              <Button
                type="submit"
                disabled={!payCustomerId || !payValid || saving}
              >
                {saving ? "Saving…" : "Save payment"}
              </Button>
            </form>
          </Panel>

          <Panel
            title="Adjustment / fee waiver"
            action="Fix a customer's balance without a payment"
          >
            <form onSubmit={handleRecordAdjustment} className="space-y-4 p-5">
              <SelectField
                id="adjCustomer"
                label="Customer"
                value={adjCustomerId}
                onValueChange={setAdjCustomerId}
                placeholder={
                  customerOptions.length ? undefined : "No customers yet"
                }
                options={customerOptions}
              />
              <div className="space-y-2">
                <Label>What do you want to do?</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={adjDirection === "LESS" ? "default" : "outline"}
                    onClick={() => setAdjDirection("LESS")}
                  >
                    Customer owes less
                  </Button>
                  <Button
                    type="button"
                    variant={adjDirection === "MORE" ? "default" : "outline"}
                    onClick={() => setAdjDirection("MORE")}
                  >
                    Customer owes more
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjAmount">By how much? (MK)</Label>
                <Input
                  id="adjAmount"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  required
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  placeholder="e.g. 2000"
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
              <Button
                type="submit"
                variant="outline"
                disabled={
                  !adjCustomerId || !adjValid || !adjReason.trim() || adjSaving
                }
              >
                {adjSaving ? "Posting…" : "Post adjustment"}
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

            <Panel
              title="Recent ledger entries"
              action={`${ledger.length} total`}
            >
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
