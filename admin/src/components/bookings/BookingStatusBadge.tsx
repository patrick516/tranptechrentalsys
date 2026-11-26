import React from "react";
import type { BookingStatus } from "../../types";

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

export default function BookingStatusBadge({
  status,
}: BookingStatusBadgeProps) {
  const styles: Record<BookingStatus, string> = {
    RESERVED: "bg-brand-blue/10 text-brand-blue border-brand-blue/30",
    OUT: "bg-brand-green/15 text-brand-green border-brand-green/40",
    RETURNED: "bg-brand-navy/10 text-brand-navy border-brand-navy/30",
    CANCELLED: "bg-brand-navy text-white border-brand-navy",
  };

  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${styles[status]}`}
    >
      {status}
    </span>
  );
}
