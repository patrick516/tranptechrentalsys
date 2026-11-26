import React, { useState } from "react";
import { apiRequest } from "../../api/client";

interface AddChairsCardProps {
  defaultDate: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function AddChairsCard({
  defaultDate,
  onSuccess,
  onError,
}: AddChairsCardProps) {
  const [qty, setQty] = useState(50);
  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest("/stock/movements", {
        method: "POST",
        body: {
          type: "PURCHASE",
          qty: Number(qty),
          date,
          note: note.trim() || "Added chairs to stock",
        },
      });
      setNote("");
      onSuccess(`Added ${Number(qty)} chairs to stock.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to add chairs");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-brand-green bg-white p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
    >
      <div>
        <label className="block text-xs font-bold text-brand-green">
          Add Chairs Qty
        </label>
        <input
          type="number"
          min={1}
          step={1}
          required
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
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
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy"
        />
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs font-semibold text-brand-navy">
          Supplier / Batch Note
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Purchased 50 chairs"
          className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy"
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-50"
        >
          {submitting ? "Adding..." : "+ Add Chairs"}
        </button>
      </div>
    </form>
  );
}
