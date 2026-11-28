// Modal to record a call, visit or message with a customer.
import { useState } from "react";
import FormDialog from "../common/FormDialog";
import FormField from "../forms/FormField";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InteractionChannel } from "../../types/customer";
import { CHANNELS } from "./customerOptions";

export interface LogInteractionPayload {
  channel: InteractionChannel;
  summary: string;
  followUpDate?: string;
}

interface LogInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  onLog: (payload: LogInteractionPayload) => Promise<void>;
}

export default function LogInteractionDialog({ open, onOpenChange, customerName, onLog }: LogInteractionDialogProps) {
  const [channel, setChannel] = useState<InteractionChannel>("WHATSAPP");
  const [summary, setSummary] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  // State starts clean because the parent remounts this dialog on every open.

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Log interaction"
      description={`Record what was said to ${customerName}.`}
      submitLabel="Save"
      submittingLabel="Saving…"
      submitDisabled={summary.trim().length < 2}
      onSubmit={() =>
        onLog({
          channel,
          summary: summary.trim(),
          ...(followUpDate ? { followUpDate } : {}),
        })
      }
    >
      <FormField label="How did you talk?" htmlFor="li-channel">
        <Select value={channel} onValueChange={(v) => setChannel(v as InteractionChannel)}>
          <SelectTrigger id="li-channel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHANNELS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Summary" htmlFor="li-summary">
        <Input id="li-summary" autoFocus required maxLength={300} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Promised to pay on Friday" />
      </FormField>

      <FormField label="Follow up on" htmlFor="li-follow" hint="Optional. Set it if you need to call or visit again.">
        <Input id="li-follow" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
      </FormField>
    </FormDialog>
  );
}
