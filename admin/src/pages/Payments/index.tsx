// Payments recording and manual ledger adjustments/waivers page
import React, { useEffect, useState, useCallback } from "react";
import { apiRequest } from "../../api/client";
import { formatMK, todayBlantyre } from "../../lib/format";

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

export default function PaymentsPage() {
  const today = todayBlantyre();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // Payment form state
  const [payCustomerId, setPayCustomerId] = useState("");
  const [payAmount, setPayAmount] = useState(20000);
  const [payMethod, setPayMethod] = useState<
    "AIRTEL_MONEY" | "MPAMBA" | "CASH" | "BANK" | "OTHER"
  >("AIRTEL_MONEY");
  const [payReference, setPayReference] = useState("");

  // Ledger adjustment / waiver form state
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

  async function handleRecordPayment(e: React.FormEvent<HTMLFormElement>) {
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

  async function handleRecordAdjustment(e: React.FormEvent<HTMLFormElement>) {
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
      setFeedback(
        `Recorded ledger adjustment of ${formatMK(Number(adjAmount))}.`,
      );
      setAdjReason("");
      await loadAll();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to record adjustment",
      );
    }
  }

  function custLabel(c?: CustomerOption | string): string {
    if (!c) return "-";
    if (typeof c === "string") return c;
    return `${c.code} • ${c.name}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Payments &amp; Ledger
        </h1>
        <p className="text-sm text-slate-500">
          Record customer payments and post manual ledger adjustments or fee
          waivers.
        </p>
      </div>

      {feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          {feedback}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleRecordPayment}
          className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
        >
          <h2 className="text-base font-semibold text-slate-900">
            Record Payment
          </h2>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Customer
            </label>
            <select
              value={payCustomerId}
              onChange={(e) => setPayCustomerId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Amount (Whole MK)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                required
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Method
              </label>
              <select
                value={payMethod}
                onChange={(e) =>
                  setPayMethod(
                    e.target.value as
                      | "AIRTEL_MONEY"
                      | "MPAMBA"
                      | "CASH"
                      | "BANK"
                      | "OTHER",
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="AIRTEL_MONEY">AIRTEL_MONEY</option>
                <option value="MPAMBA">MPAMBA</option>
                <option value="CASH">CASH</option>
                <option value="BANK">BANK</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Reference / Receipt
            </label>
            <input
              type="text"
              value={payReference}
              onChange={(e) => setPayReference(e.target.value)}
              placeholder="Transaction ID or receipt number"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Save Payment
          </button>
        </form>

        <form
          onSubmit={handleRecordAdjustment}
          className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
        >
          <h2 className="text-base font-semibold text-slate-900">
            Adjustment / Fee Waiver
          </h2>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Customer
            </label>
            <select
              value={adjCustomerId}
              onChange={(e) => setAdjCustomerId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Adjustment Amount (Negative waives balance, e.g. -8000)
            </label>
            <input
              type="number"
              step={1}
              required
              value={adjAmount}
              onChange={(e) => setAdjAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Reason
            </label>
            <input
              type="text"
              required
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="e.g. Goodwill late fee waiver"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
          >
            Post Adjustment
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-sm text-slate-600">Loading history...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto">
            <h2 className="text-base font-semibold text-slate-900">
              Recent Payments
            </h2>
            <table className="mt-3 w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2">Date</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Method</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 15).map((p) => (
                  <tr key={p._id} className="border-b border-slate-100">
                    <td className="py-2 font-mono text-xs">{p.paidDate}</td>
                    <td className="py-2 text-xs">{custLabel(p.customerId)}</td>
                    <td className="py-2 text-xs">{p.method}</td>
                    <td className="py-2 text-right font-semibold">
                      {formatMK(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto">
            <h2 className="text-base font-semibold text-slate-900">
              Recent Ledger Entries
            </h2>
            <table className="mt-3 w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2">Date</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.slice(0, 15).map((l) => (
                  <tr key={l._id} className="border-b border-slate-100">
                    <td className="py-2 font-mono text-xs">{l.date}</td>
                    <td className="py-2 text-xs font-medium">{l.type}</td>
                    <td className="py-2 text-xs text-slate-600">
                      {l.description || l.reason || "-"}
                    </td>
                    <td className="py-2 text-right font-semibold">
                      {formatMK(l.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
