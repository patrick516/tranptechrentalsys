// Booking status as text with a small dot (no coloured badge background).
// "Overdue" is calculated by the page (status OUT and past the end date).
import type { BookingStatus } from "../../types";
import { cn } from "@/lib/utils";

interface BookingStatusBadgeProps {
  status: BookingStatus;
  overdue?: boolean;
}

const STYLES: Record<BookingStatus, { label: string; dot: string }> = {
  RESERVED: { label: "Reserved", dot: "bg-slate-400" },
  OUT: { label: "Out", dot: "bg-primary" },
  RETURNED: { label: "Returned", dot: "bg-green-600" },
  CANCELLED: { label: "Cancelled", dot: "bg-slate-300" },
};

export default function BookingStatusBadge({ status, overdue = false }: BookingStatusBadgeProps) {
  const style = STYLES[status];
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 text-sm">
      <span className="inline-flex items-center gap-2 text-slate-700">
        <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
        {style.label}
      </span>
      {overdue && <span className="text-xs font-medium text-red-600">Overdue</span>}
    </span>
  );
}
