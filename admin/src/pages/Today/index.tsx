import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { todayBlantyre } from "../../lib/format";

interface BookingSummary {
  _id: string;
  code: string;
  status: string;
  startDate: string;
  endDate: string;
  qty: number;
  qtyOut: number;
}

export default function TodayPage() {
  const today = todayBlantyre();
  const [bookings, setBookings] = useState<BookingSummary[]>([]);

  useEffect(() => {
    apiRequest<{ data: BookingSummary[] }>("/bookings")
      .then((res) => setBookings(res.data || []))
      .catch(() => setBookings([]));
  }, []);

  const todaysPickups = bookings.filter(
    (b) => b.status === "RESERVED" && b.startDate <= today,
  );
  const todaysReturns = bookings.filter(
    (b) => b.status === "OUT" && b.endDate <= today,
  );

  return (
    <div className="space-y-6 font-sans text-brand-navy">
      <div>
        <h1 className="text-2xl font-bold">
          Today&apos;s Operations ({today})
        </h1>
        <p className="text-sm text-brand-navy/75">
          Scheduled pickups and expected chair returns.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-brand-blue bg-white p-4">
          <h2 className="text-base font-bold text-brand-blue">
            Due Pickups ({todaysPickups.length})
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {todaysPickups.map((b) => (
              <li key={b._id}>
                {b.code} — {b.qty} chairs ({b.startDate})
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-brand-green bg-white p-4">
          <h2 className="text-base font-bold text-brand-green">
            Due Returns ({todaysReturns.length})
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {todaysReturns.map((b) => (
              <li key={b._id}>
                {b.code} — {b.qtyOut} chairs out (due {b.endDate})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
