// Modal form to record a full or partial return (spec 7.6).
// Assumption: damaged chairs are among those returned; lost chairs are not.
import { useState } from "react";
import FormDialog from "../common/FormDialog";
import FormField from "../forms/FormField";
import { Input } from "@/components/ui/input";
import type { BookingItem } from "./bookingTypes";
import { isBusinessDateText, toWholeNumber } from "./bookingMath";

export interface ReturnPayload {
  returnDate: string;
  qtyReturned: number;
  qtyLost: number;
  qtyDamaged: number;
}

interface ReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingItem | null;
  today: string;
  onReturn: (booking: BookingItem, payload: ReturnPayload) => Promise<void>;
}

export default function ReturnDialog({ open, onOpenChange, booking, today, onReturn }: ReturnDialogProps) {
  const [returnDate, setReturnDate] = useState(today);
  const [returned, setReturned] = useState("");
  const [damaged, setDamaged] = useState("0");
  const [lost, setLost] = useState("0");

  // State starts clean because the parent remounts this dialog on every open.

  if (!booking) return null;

  const r = toWholeNumber(returned);
  const d = toWholeNumber(damaged);
  const l = toWholeNumber(lost);
  const numbersOk = r !== null && d !== null && l !== null;

  let problem = "";
  if (!numbersOk) problem = "Enter whole numbers (0 or more).";
  else if (r + l < 1) problem = "Enter at least one returned or lost chair.";
  else if (r + l > booking.qtyOut) problem = `Only ${booking.qtyOut} chairs are out.`;
  else if (d > r) problem = "Damaged chairs cannot be more than the chairs returned.";

  const valid = problem === "" && isBusinessDateText(returnDate);
  const remaining = numbersOk ? booking.qtyOut - r - l : booking.qtyOut;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Record return for ${booking.code}`}
      description={`${booking.qtyOut} chairs are currently out.`}
      submitLabel="Save return"
      submittingLabel="Saving…"
      submitDisabled={!valid}
      onSubmit={() =>
        onReturn(booking, { returnDate, qtyReturned: r ?? 0, qtyLost: l ?? 0, qtyDamaged: d ?? 0 })
      }
    >
      <FormField label="Return date" htmlFor="rt-date">
        <Input id="rt-date" type="date" required value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Chairs returned" htmlFor="rt-returned">
          <Input id="rt-returned" type="number" inputMode="numeric" min={0} value={returned} onChange={(e) => setReturned(e.target.value)} />
        </FormField>
        <FormField label="Of which damaged" htmlFor="rt-damaged">
          <Input id="rt-damaged" type="number" inputMode="numeric" min={0} value={damaged} onChange={(e) => setDamaged(e.target.value)} />
        </FormField>
        <FormField label="Lost or missing" htmlFor="rt-lost">
          <Input id="rt-lost" type="number" inputMode="numeric" min={0} value={lost} onChange={(e) => setLost(e.target.value)} />
        </FormField>
      </div>

      {problem ? (
        <p className="text-sm text-red-600">{problem}</p>
      ) : (
        <p className="border-t border-slate-200 pt-4 text-sm text-slate-600">
          {remaining === 0
            ? "All chairs are accounted for. The booking will be marked Returned."
            : `${remaining} chair${remaining === 1 ? "" : "s"} will still be out after this.`}
        </p>
      )}
    </FormDialog>
  );
}
