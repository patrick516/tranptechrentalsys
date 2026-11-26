// Payment and chair-return promise tracking page styled with TranpTech brand tokens
import React, { useEffect, useState, useCallback } from "react";
import { apiRequest } from "../../api/client";
import { formatMK, todayBlantyre } from "../../lib/format";

interface CustomerRef {
  _id: string;
  code: string;
  name: string;
}

interface BookingRef {
  _id: string;
  code: string;
  status: string;
}

interface PromiseItem {
  _id: string;
  customerId: CustomerRef | string;
  bookingId?: BookingRef | string | null;
  kind: "PAYMENT" | "RETURN";
  promisedDate: string;
  promisedAmount?: number | null;
  status: "PENDING" | "KEPT" | "BROKEN" | "CANCELLED";
  notes: string;
}

export default function PromisesPage() {
  const today = todayBlantyre();
  const [customers, setCustomers] = useState<CustomerRef[]>([]);
  const [promises, setPromises] = useState<PromiseItem[]>([]);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // Create promise form state
  const [customerId, setCustomerId] = useState("");
  const [kind, setKind] = useState<"PAYMENT" | "RETURN">("PAYMENT");
  const [promisedDate, setPromisedDate] = useState(today);
  const [promisedAmount, setPromisedAmount] = useState<string>("20000");
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = overdueOnly ? "?overdue=true" : "";
      const [custRes, promRes] = await Promise.all([
        apiRequest<{ data: CustomerRef[] }>("/customers"),
        apiRequest<{ data: PromiseItem[] }>(`/promises${query}`),
      ]);
      const custs = custRes.data || [];
      setCustomers(custs);
      setPromises(promRes.data || []);
      if (custs.length > 0) {
        setCustomerId((prev) => prev || custs[0]._id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load promises");
    } finally {
      setLoading(false);
    }
  }, [overdueOnly]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreatePromise(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback("");
    setError("");
    try {
      const parsedAmount =
        kind === "PAYMENT" && promisedAmount.trim() !== ""
          ? Number(promisedAmount)
          : null;

      await apiRequest("/promises", {
        method: "POST",
        body: {
          customerId,
          kind,
          promisedDate,
          promisedAmount: parsedAmount,
          notes,
        },
      });
      setFeedback("Recorded customer promise.");
      setNotes("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create promise");
    }
  }

  async function handleStatusUpdate(
    id: string,
    status: "PENDING" | "KEPT" | "BROKEN" | "CANCELLED",
  ) {
    setFeedback("");
    setError("");
    try {
      await apiRequest(`/promises/${id}/status`, {
        method: "PATCH",
        body: { status },
      });
      setFeedback(`Marked promise as ${status}.`);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update promise status",
      );
    }
  }

  function formatCustomer(c: CustomerRef | string): string {
    if (typeof c === "string") return c;
    return `${c.code} • ${c.name}`;
  }

  return (
    <div className="space-y-6 font-sans text-brand-navy">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Promises</h1>
          <p className="text-sm text-brand-navy/75">
            Track customer commitments for payments and chair returns.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-brand-navy">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="rounded border-brand-blue text-brand-blue focus:ring-brand-green"
          />
          Overdue only
        </label>
      </div>

      {feedback && (
        <div className="rounded-md border border-brand-green bg-brand-green px-4 py-2.5 text-sm font-medium text-white">
          {feedback}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-brand-navy bg-brand-navy px-4 py-2.5 text-sm text-white">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreatePromise}
        className="rounded-lg border border-brand-blue bg-white p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
      >
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-brand-navy">
            Customer
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green"
          >
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-navy">
            Type
          </label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "PAYMENT" | "RETURN")}
            className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green"
          >
            <option value="PAYMENT">PAYMENT</option>
            <option value="RETURN">RETURN</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-navy">
            Promised Date
          </label>
          <input
            type="date"
            required
            value={promisedDate}
            onChange={(e) => setPromisedDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-navy">
            {kind === "PAYMENT" ? "Amount (MK)" : "Amount (Optional)"}
          </label>
          <input
            type="number"
            min={1}
            step={1}
            disabled={kind === "RETURN"}
            value={promisedAmount}
            onChange={(e) => setPromisedAmount(e.target.value)}
            className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={!customerId}
            className="w-full rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-50"
          >
            Save Promise
          </button>
        </div>

        <div className="md:col-span-6">
          <label className="block text-xs font-semibold text-brand-navy">
            Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Agreement details from call or WhatsApp"
            className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>
      </form>

      <div className="rounded-lg border border-brand-blue bg-white p-4 overflow-x-auto">
        {loading ? (
          <div className="text-sm text-brand-navy">Loading promises...</div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-brand-blue/30 text-xs font-semibold text-brand-blue">
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Kind</th>
                <th className="py-2 pr-3">Promised Date</th>
                <th className="py-2 pr-3 text-right">Amount</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Update</th>
              </tr>
            </thead>
            <tbody>
              {promises.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-4 text-center text-brand-navy/70"
                  >
                    No promises found.
                  </td>
                </tr>
              ) : (
                promises.map((p) => (
                  <tr key={p._id} className="border-b border-brand-blue/15">
                    <td className="py-2.5 pr-3 font-medium">
                      {formatCustomer(p.customerId)}
                    </td>
                    <td className="py-2.5 pr-3 text-xs font-semibold">
                      {p.kind}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs">
                      {p.promisedDate}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold">
                      {p.promisedAmount ? formatMK(p.promisedAmount) : "-"}
                    </td>
                    <td className="py-2.5 pr-3 text-xs font-bold text-brand-blue">
                      {p.status}
                    </td>
                    <td className="py-2.5 text-right space-x-1.5 whitespace-nowrap">
                      {p.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(p._id, "KEPT")}
                            className="rounded-md bg-brand-green px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-navy"
                          >
                            Kept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(p._id, "BROKEN")}
                            className="rounded-md border border-brand-navy px-2.5 py-1 text-xs font-semibold text-brand-navy hover:bg-brand-navy hover:text-white"
                          >
                            Broken
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
