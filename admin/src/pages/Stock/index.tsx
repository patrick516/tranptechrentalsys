// Stock availability checker, quick Add Chairs form, and stock movement ledger
import React, { useEffect, useState, useCallback } from "react";
import { apiRequest } from "../../api/client";
import { todayBlantyre } from "../../lib/format";

interface AvailabilityDay {
  date: string;
  totalOwned: number;
  reservedOrOut: number;
  available: number;
}

interface AvailabilityReport {
  totalOwned: number;
  minAvailable: number;
  days: AvailabilityDay[];
}

interface MovementRow {
  _id: string;
  date: string;
  type: "PURCHASE" | "LOST" | "DAMAGED" | "REPAIRED" | "FOUND" | "WRITE_OFF";
  qty: number;
  note: string;
}

export default function StockPage() {
  const today = todayBlantyre();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [report, setReport] = useState<AvailabilityReport | null>(null);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // Quick Add Chairs form state (PURCHASE)
  const [addChairsQty, setAddChairsQty] = useState(50);
  const [addChairsDate, setAddChairsDate] = useState(today);
  const [addChairsNote, setAddChairsNote] = useState("");
  const [addingChairs, setAddingChairs] = useState(false);

  // General stock movement form state
  const [type, setType] = useState<MovementRow["type"]>("PURCHASE");
  const [qty, setQty] = useState(20);
  const [movDate, setMovDate] = useState(today);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadStock = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [availRes, movRes] = await Promise.all([
        apiRequest<{ data: AvailabilityReport }>(
          `/stock/availability?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`,
        ),
        apiRequest<{ data: MovementRow[] }>("/stock/movements"),
      ]);
      setReport(availRes.data);
      setMovements(movRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stock");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  async function handleQuickAddChairs(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddingChairs(true);
    setFeedback("");
    setError("");
    try {
      await apiRequest("/stock/movements", {
        method: "POST",
        body: {
          type: "PURCHASE",
          qty: Number(addChairsQty),
          date: addChairsDate,
          note: addChairsNote.trim() || "Added chairs to inventory",
        },
      });
      setFeedback(`Added ${Number(addChairsQty)} chairs to stock.`);
      setAddChairsNote("");
      await loadStock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add chairs");
    } finally {
      setAddingChairs(false);
    }
  }

  async function handleAddMovement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setFeedback("");
    setError("");
    try {
      await apiRequest("/stock/movements", {
        method: "POST",
        body: {
          type,
          qty: Number(qty),
          date: movDate,
          note: note.trim(),
        },
      });
      setFeedback(`Recorded ${type} movement of ${Number(qty)} chairs.`);
      setNote("");
      await loadStock();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to record stock movement",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 font-sans text-brand-navy">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Chair Stock</h1>
          <p className="text-sm text-brand-navy/75">
            Total Owned: <strong>{report?.totalOwned ?? 0}</strong> • Min
            Available in Range: <strong>{report?.minAvailable ?? 0}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-md border border-brand-blue bg-white px-3 py-1.5 text-sm text-brand-navy"
          />
          <span className="text-xs text-brand-navy/70">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-md border border-brand-blue bg-white px-3 py-1.5 text-sm text-brand-navy"
          />
        </div>
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

      {/* Dedicated Add Chairs Card */}
      <form
        onSubmit={handleQuickAddChairs}
        className="rounded-lg border border-brand-green bg-white p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-bold text-brand-green">
            Add Chairs Qty (Purchase)
          </label>
          <input
            type="number"
            min={1}
            step={1}
            required
            value={addChairsQty}
            onChange={(e) => setAddChairsQty(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-navy">
            Date
          </label>
          <input
            type="date"
            required
            value={addChairsDate}
            onChange={(e) => setAddChairsDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-brand-navy">
            Supplier / Batch Note
          </label>
          <input
            type="text"
            value={addChairsNote}
            onChange={(e) => setAddChairsNote(e.target.value)}
            placeholder="e.g. Bought 50 plastic chairs in Limbe"
            className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={addingChairs}
            className="w-full rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-50"
          >
            {addingChairs ? "Adding..." : "+ Add Chairs"}
          </button>
        </div>
      </form>

      {/* General Stock Adjustment / Movement Form */}
      <form
        onSubmit={handleAddMovement}
        className="rounded-lg border border-brand-blue bg-white p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-semibold text-brand-navy">
            Movement Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MovementRow["type"])}
            className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy"
          >
            <option value="PURCHASE">PURCHASE (+)</option>
            <option value="FOUND">FOUND (+)</option>
            <option value="REPAIRED">REPAIRED (+)</option>
            <option value="LOST">LOST (-)</option>
            <option value="DAMAGED">DAMAGED (-)</option>
            <option value="WRITE_OFF">WRITE_OFF (-)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-navy">
            Quantity
          </label>
          <input
            type="number"
            min={1}
            step={1}
            required
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-navy">
            Date
          </label>
          <input
            type="date"
            required
            value={movDate}
            onChange={(e) => setMovDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-brand-navy">
            Note
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for movement"
            className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-50"
          >
            {saving ? "Saving..." : "Record Movement"}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-brand-blue bg-white p-4">
          <h2 className="text-base font-bold text-brand-navy">
            Daily Availability Breakdown
          </h2>
          {loading ? (
            <div className="mt-3 text-sm text-brand-navy">Loading...</div>
          ) : (
            <table className="mt-3 w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-brand-blue/30 text-xs font-semibold text-brand-blue">
                  <th className="py-2">Date</th>
                  <th className="py-2 text-right">Reserved / Out</th>
                  <th className="py-2 text-right">Available</th>
                </tr>
              </thead>
              <tbody>
                {(report?.days || []).map((d) => (
                  <tr key={d.date} className="border-b border-brand-blue/15">
                    <td className="py-2 font-mono text-xs">{d.date}</td>
                    <td className="py-2 text-right">{d.reservedOrOut}</td>
                    <td className="py-2 text-right font-bold text-brand-green">
                      {d.available}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-lg border border-brand-blue bg-white p-4">
          <h2 className="text-base font-bold text-brand-navy">
            Recent Stock Movements
          </h2>
          <table className="mt-3 w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-brand-blue/30 text-xs font-semibold text-brand-blue">
                <th className="py-2">Date</th>
                <th className="py-2">Type</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 pl-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {movements.slice(0, 15).map((m) => (
                <tr key={m._id} className="border-b border-brand-blue/15">
                  <td className="py-2 font-mono text-xs">{m.date}</td>
                  <td className="py-2 text-xs font-semibold">{m.type}</td>
                  <td className="py-2 text-right font-bold">{m.qty}</td>
                  <td className="py-2 pl-3 text-xs text-brand-navy/75">
                    {m.note || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
