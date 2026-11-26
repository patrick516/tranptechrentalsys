// Bookings management page: create, pickup, partial/full return, extend, and cancel rentals
import React, { useEffect, useState, useCallback } from "react";
import { apiRequest } from "../../api/client";
import { formatMK, todayBlantyre } from "../../lib/format";

interface CustomerRef {
  _id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "WATCHLIST" | "BLOCKED";
}

interface BookingItem {
  _id: string;
  code: string;
  customerId: CustomerRef | string;
  status: "RESERVED" | "OUT" | "RETURNED" | "CANCELLED";
  startDate: string;
  endDate: string;
  qty: number;
  qtyOut: number;
  qtyReturned: number;
  qtyLost: number;
  qtyDamaged: number;
  ratePerChairPerDay: number;
  lateFeePerDay: number;
  venue: string;
}

export default function BookingsPage() {
  const today = todayBlantyre();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [customers, setCustomers] = useState<CustomerRef[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // Create booking form state
  const [customerId, setCustomerId] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [qty, setQty] = useState(20);
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = statusFilter
        ? `?status=${encodeURIComponent(statusFilter)}`
        : "";
      const [bookingsRes, customersRes] = await Promise.all([
        apiRequest<{ data: BookingItem[] }>(`/bookings${query}`),
        apiRequest<{ data: CustomerRef[] }>("/customers"),
      ]);
      const list = bookingsRes.data || [];
      const custList = customersRes.data || [];
      setBookings(list);
      setCustomers(custList);
      if (!customerId && custList.length > 0) {
        setCustomerId(custList[0]._id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, customerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreateBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback("");
    setError("");
    try {
      const res = await apiRequest<{
        data: { booking: BookingItem; warnings?: string[] };
      }>("/bookings", {
        method: "POST",
        body: {
          customerId,
          startDate,
          endDate,
          qty: Number(qty),
          venue,
          notes,
        },
      });
      const warns = res.data?.warnings?.length
        ? ` (Warnings: ${res.data.warnings.join(", ")})`
        : "";
      setFeedback(`Created booking ${res.data.booking.code}${warns}.`);
      setVenue("");
      setNotes("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAction(
    id: string,
    action: "pickup" | "extend" | "cancel",
    body: unknown = {},
  ) {
    setFeedback("");
    setError("");
    try {
      await apiRequest(`/bookings/${id}/${action}`, { method: "POST", body });
      setFeedback(`Booking ${action} completed.`);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${action} booking`,
      );
    }
  }

  async function handleFullReturn(booking: BookingItem) {
    setFeedback("");
    setError("");
    try {
      await apiRequest(`/bookings/${booking._id}/return`, {
        method: "POST",
        body: {
          returnDate: today,
          qtyReturned: booking.qtyOut,
          qtyLost: 0,
          qtyDamaged: 0,
        },
      });
      setFeedback(`Returned ${booking.qtyOut} chairs for ${booking.code}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record return");
    }
  }

  function getCustomerLabel(c: CustomerRef | string): string {
    if (typeof c === "string") return c;
    return `${c.code} • ${c.name} (${c.status})`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bookings</h1>
          <p className="text-sm text-slate-500">
            Reserve chairs, record pickups, extend dates, and process returns.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="RESERVED">RESERVED</option>
          <option value="OUT">OUT</option>
          <option value="RETURNED">RETURNED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
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

      <form
        onSubmit={handleCreateBooking}
        className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
      >
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700">
            Customer
          </label>
          <select
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.code} - {c.name} ({c.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Start Date
          </label>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            End Date
          </label>
          <input
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Chairs Qty
          </label>
          <input
            type="number"
            min={1}
            required
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={submitting || !customerId}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Create Booking"}
          </button>
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-700">
            Venue / Event Location
          </label>
          <input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g. Chichiri Hall, Blantyre"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-700">
            Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional delivery or pickup notes"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto">
        {loading ? (
          <div className="text-sm text-slate-600">Loading bookings...</div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Dates</th>
                <th className="py-2 pr-3">Qty / Out</th>
                <th className="py-2 pr-3">Rate</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-500">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b._id} className="border-b border-slate-100">
                    <td className="py-2.5 pr-3 font-mono text-xs">{b.code}</td>
                    <td className="py-2.5 pr-3">
                      {getCustomerLabel(b.customerId)}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs">
                      {b.startDate} → {b.endDate}
                    </td>
                    <td className="py-2.5 pr-3">
                      {b.qty} / <strong>{b.qtyOut}</strong>
                    </td>
                    <td className="py-2.5 pr-3">
                      {formatMK(b.ratePerChairPerDay)}/d
                    </td>
                    <td className="py-2.5 pr-3 text-xs font-semibold">
                      {b.status}
                    </td>
                    <td className="py-2.5 text-right space-x-1.5 whitespace-nowrap">
                      {b.status === "RESERVED" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleAction(b._id, "pickup", {
                                pickupDate: today,
                              })
                            }
                            className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100"
                          >
                            Pickup
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAction(b._id, "cancel", {
                                reason: "Cancelled in UI",
                              })
                            }
                            className="rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {b.status === "OUT" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleFullReturn(b)}
                            className="rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                          >
                            Return All
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAction(b._id, "extend", {
                                days: 1,
                                requestedDate: today,
                              })
                            }
                            className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100"
                          >
                            +1 Day
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
