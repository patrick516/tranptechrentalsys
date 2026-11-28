// Modal form to add a customer with one primary contact.
// More contacts can be added later from the customer page.
import { useState } from "react";
import FormDialog from "../common/FormDialog";
import FormField from "../forms/FormField";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isMalawiPhone, normalizeMalawiPhone } from "../../utils/phone";
import type { CustomerType } from "../../types/customer";
import { CUSTOMER_TYPES } from "./customerOptions";

export interface NewCustomerPayload {
  name: string;
  type: CustomerType;
  area: string;
  contacts: { name: string; phone: string; isPrimary: boolean }[];
}

interface NewCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: NewCustomerPayload) => Promise<void>;
}

export default function NewCustomerDialog({ open, onOpenChange, onCreate }: NewCustomerDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CustomerType>("BUSINESS");
  const [area, setArea] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");

  // State starts clean because the parent remounts this dialog on every open.

  const phoneOk = isMalawiPhone(phone);
  const canSubmit = name.trim().length >= 2 && contactName.trim().length >= 2 && phoneOk;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New customer"
      description="Add the customer and the person we deal with. You can add more contacts later."
      submitLabel="Add customer"
      submittingLabel="Adding…"
      submitDisabled={!canSubmit}
      onSubmit={() =>
        onCreate({
          name: name.trim(),
          type,
          area: area.trim(),
          contacts: [{ name: contactName.trim(), phone: normalizeMalawiPhone(phone), isPrimary: true }],
        })
      }
    >
      <FormField label="Customer name" htmlFor="nc-name">
        <Input id="nc-name" autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. St. Andrews School" />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Type" htmlFor="nc-type">
          <Select value={type} onValueChange={(v) => setType(v as CustomerType)}>
            <SelectTrigger id="nc-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CUSTOMER_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Area" htmlFor="nc-area" hint="Optional, e.g. Madulira.">
          <Input id="nc-area" value={area} onChange={(e) => setArea(e.target.value)} />
        </FormField>
      </div>

      <div className="grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
        <FormField label="Contact person" htmlFor="nc-contact">
          <Input id="nc-contact" required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full name" />
        </FormField>
        <FormField
          label="Phone number"
          htmlFor="nc-phone"
          error={phone.trim() !== "" && !phoneOk ? "Enter a Malawi number, e.g. 0995 049 331." : undefined}
          hint={phoneOk ? `Will be saved as ${normalizeMalawiPhone(phone)}` : "099…, 088… or +265…"}
        >
          <Input id="nc-phone" type="tel" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0995049331" />
        </FormField>
      </div>
    </FormDialog>
  );
}
