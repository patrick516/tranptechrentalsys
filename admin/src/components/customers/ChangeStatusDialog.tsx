// Modal to change a customer's standing: Active, Watchlist or Blocked.
import { useState } from "react";
import FormDialog from "../common/FormDialog";
import FormField from "../forms/FormField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Customer, CustomerStatus as StatusValue } from "../../types";
import { STATUS_OPTIONS } from "./customerOptions";

interface ChangeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onChange: (customer: Customer, status: StatusValue) => Promise<void>;
}

export default function ChangeStatusDialog({ open, onOpenChange, customer, onChange }: ChangeStatusDialogProps) {
  const [status, setStatus] = useState<StatusValue>("ACTIVE");

  // State starts clean because the parent remounts this dialog on every open.

  if (!customer) return null;
  const chosen = STATUS_OPTIONS.find((s) => s.value === status);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Change status for ${customer.name}`}
      description={`${customer.code} is currently ${customer.status.toLowerCase()}.`}
      submitLabel="Save status"
      submittingLabel="Saving…"
      destructive={status === "BLOCKED"}
      submitDisabled={status === customer.status}
      onSubmit={() => onChange(customer, status)}
    >
      <FormField label="Status" htmlFor="cs-status" hint={chosen?.note}>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusValue)}>
          <SelectTrigger id="cs-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </FormDialog>
  );
}
