// Modal form to reserve chairs for a customer.
import { useState } from "react";
import FormDialog from "../common/FormDialog";
import FormField from "../forms/FormField";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomerRef } from "./bookingTypes";
import { daysInclusive, toWholeNumber } from "./bookingMath";

export interface NewBookingPayload {
  customerId: string;
  startDate: string;
  endDate: string;
  qty: number;
  venue: string;
  notes: string;
}

interface NewBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: CustomerRef[];
  today: string;
  onCreate: (payload: NewBookingPayload) => Promise<void>;
}

const STATUS_WARNING: Record<string, string> = {
  WATCHLIST: "This customer is on the watchlist.",
  BLOCKED: "This customer is blocked. The system may refuse the booking.",
};

export default function NewBookingDialog({ open, onOpenChange, customers, today, onCreate }: NewBookingDialogProps) {
  const [customerId, setCustomerId] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [qty, setQty] = useState("20");
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");

  // State starts clean because the parent remounts this dialog on every open.

  const chairs = toWholeNumber(qty);
  const days = daysInclusive(startDate, endDate);
  const customer = customers.find((c) => c._id === customerId);
  const canSubmit = Boolean(customerId) && chairs !== null && chairs >= 1 && days >= 1;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New booking"
      description="Reserve chairs for a customer. Pick-up is recorded later."
      submitLabel="Create booking"
      submittingLabel="Creating…"
      submitDisabled={!canSubmit}
      onSubmit={() =>
        onCreate({ customerId, startDate, endDate, qty: chairs ?? 0, venue: venue.trim(), notes: notes.trim() })
      }
    >
      <FormField
        label="Customer"
        htmlFor="nb-customer"
        error={customer ? STATUS_WARNING[customer.status] : undefined}
      >
        <Select value={customerId} onValueChange={setCustomerId} disabled={customers.length === 0}>
          <SelectTrigger id="nb-customer">
            <SelectValue placeholder={customers.length === 0 ? "No customers yet" : "Choose a customer"} />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c._id} value={c._id}>
                {c.code} · {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Start date" htmlFor="nb-start">
          <Input id="nb-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </FormField>
        <FormField
          label="End date"
          htmlFor="nb-end"
          error={days < 1 ? "End date must be on or after the start date." : undefined}
          hint={days >= 1 ? `${days} hire day${days === 1 ? "" : "s"}` : undefined}
        >
          <Input id="nb-end" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </FormField>
      </div>

      <FormField
        label="Number of chairs"
        htmlFor="nb-qty"
        error={chairs === null || chairs < 1 ? "Enter a whole number, 1 or more." : undefined}
      >
        <Input id="nb-qty" type="number" inputMode="numeric" min={1} required value={qty} onChange={(e) => setQty(e.target.value)} />
      </FormField>

      <FormField label="Venue or event location" htmlFor="nb-venue">
        <Input id="nb-venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Chichiri Hall, Blantyre" />
      </FormField>

      <FormField label="Notes" htmlFor="nb-notes" hint="Optional delivery or pick-up notes.">
        <Input id="nb-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
    </FormDialog>
  );
}
