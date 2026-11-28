// Modal form to cancel a booking before pick-up. A reason is required (spec BKG-9).
import { useState } from "react";
import FormDialog from "../common/FormDialog";
import FormField from "../forms/FormField";
import { Input } from "@/components/ui/input";
import type { BookingItem } from "./bookingTypes";

interface CancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingItem | null;
  onCancelBooking: (booking: BookingItem, reason: string) => Promise<void>;
}

export default function CancelDialog({ open, onOpenChange, booking, onCancelBooking }: CancelDialogProps) {
  const [reason, setReason] = useState("");

  // State starts clean because the parent remounts this dialog on every open.

  if (!booking) return null;
  const trimmed = reason.trim();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Cancel ${booking.code}?`}
      description="The charges are voided and the cancellation is recorded in the audit log. This cannot be undone."
      submitLabel="Cancel booking"
      submittingLabel="Cancelling…"
      cancelLabel="Keep booking"
      destructive
      submitDisabled={trimmed.length < 3}
      onSubmit={() => onCancelBooking(booking, trimmed)}
    >
      <FormField label="Reason" htmlFor="cb-reason" hint="For example: customer changed the date.">
        <Input id="cb-reason" autoFocus required maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
      </FormField>
    </FormDialog>
  );
}
