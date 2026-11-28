// Modal form to extend a booking. The extension is charged on the chairs still
// out and is due on the day it is requested (spec 2.3).
import { useState } from "react";
import FormDialog from "../common/FormDialog";
import FormField from "../forms/FormField";
import { Input } from "@/components/ui/input";
import { formatMK } from "../../lib/format";
import type { BookingItem } from "./bookingTypes";
import { addDays, isBusinessDateText, toWholeNumber } from "./bookingMath";

export interface ExtendPayload {
  days: number;
  requestedDate: string;
}

interface ExtendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingItem | null;
  today: string;
  onExtend: (booking: BookingItem, payload: ExtendPayload) => Promise<void>;
}

export default function ExtendDialog({ open, onOpenChange, booking, today, onExtend }: ExtendDialogProps) {
  const [days, setDays] = useState("1");
  const [requestedDate, setRequestedDate] = useState(today);

  // State starts clean because the parent remounts this dialog on every open.

  if (!booking) return null;

  const n = toWholeNumber(days);
  const valid = n !== null && n >= 1 && n <= 365 && isBusinessDateText(requestedDate);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Extend ${booking.code}`}
      description="Add days to the end of this booking. The charge is due on the day it is requested."
      submitLabel="Extend booking"
      submittingLabel="Extending…"
      submitDisabled={!valid}
      onSubmit={() => onExtend(booking, { days: n ?? 0, requestedDate })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Days to add"
          htmlFor="ex-days"
          error={n === null || n < 1 || n > 365 ? "Enter a whole number from 1 to 365." : undefined}
        >
          <Input id="ex-days" type="number" inputMode="numeric" min={1} max={365} required value={days} onChange={(e) => setDays(e.target.value)} />
        </FormField>
        <FormField label="Requested on" htmlFor="ex-date">
          <Input id="ex-date" type="date" required value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} />
        </FormField>
      </div>

      <dl className="grid grid-cols-2 gap-y-2 border-t border-slate-200 pt-4 text-sm">
        <dt className="text-slate-500">Current end date</dt>
        <dd className="text-right tabular-nums">{booking.endDate}</dd>
        <dt className="text-slate-500">New end date</dt>
        <dd className="text-right font-medium tabular-nums">{valid ? addDays(booking.endDate, n ?? 0) : "–"}</dd>
        <dt className="text-slate-500">Chairs still out</dt>
        <dd className="text-right tabular-nums">{booking.qtyOut}</dd>
        <dt className="text-slate-500">Extension charge (estimate)</dt>
        <dd className="text-right font-semibold tabular-nums">
          {valid ? formatMK(booking.qtyOut * booking.ratePerChairPerDay * (n ?? 0)) : "–"}
        </dd>
      </dl>
      <p className="text-xs text-slate-500">
        If it is not paid by the end of {requestedDate || "that day"}, a late fee of {formatMK(booking.lateFeePerDay)} per day applies.
      </p>
    </FormDialog>
  );
}
