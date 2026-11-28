// Messages: send reminders over WhatsApp or SMS and audit every delivery.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { apiRequest } from "../../api/client";
import Topbar from "../../components/layout/Topbar";
import Panel from "../../components/common/Panel";
import DataTable, { type Column } from "../../components/common/DataTable";
import SelectField from "../../components/forms/SelectField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CustomerOption {
  _id: string;
  code: string;
  name: string;
}

interface MessageLogRow {
  _id: string;
  toPhone: string;
  network: string;
  channel: "WHATSAPP" | "SMS";
  body: string;
  status: string;
  createdAt: string;
}

const STATUS_TONE: Record<string, string> = {
  SENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  READ: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  QUEUED: "bg-slate-50 text-slate-600 border-slate-200",
  PENDING: "bg-slate-50 text-slate-600 border-slate-200",
};

export default function MessagesPage() {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [messages, setMessages] = useState<MessageLogRow[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [channel, setChannel] = useState<"WHATSAPP" | "SMS">("WHATSAPP");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [custRes, msgRes] = await Promise.all([
        apiRequest<{ data: CustomerOption[] }>("/customers"),
        apiRequest<{ data: MessageLogRow[] }>("/messages"),
      ]);
      const custs = custRes.data || [];
      setCustomers(custs);
      setMessages(msgRes.data || []);
      setCustomerId((prev) => prev || custs[0]?._id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback("");
    setError("");
    try {
      await apiRequest("/messages", {
        method: "POST",
        body: { customerId, channel, body },
      });
      setFeedback(`Queued ${channel} message.`);
      setBody("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue message");
    }
  }

  const columns: Column<MessageLogRow>[] = [
    {
      key: "createdAt",
      header: "Sent",
      render: (d) => <span className="tabular-nums text-slate-600">{d.createdAt}</span>,
    },
    { key: "toPhone", header: "To", render: (d) => <span className="tabular-nums">{d.toPhone}</span> },
    { key: "channel", header: "Channel", render: (d) => <span className="text-slate-600">{d.channel}</span> },
    {
      key: "status",
      header: "Status",
      render: (d) => (
        <span
          className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${STATUS_TONE[d.status] || "border-slate-200 bg-slate-50 text-slate-600"}`}
        >
          {d.status}
        </span>
      ),
    },
    {
      key: "body",
      header: "Message",
      render: (d) => <span className="line-clamp-2 text-slate-600">{d.body}</span>,
    },
  ];

  const failedCount = messages.filter((m) => m.status === "FAILED").length;

  return (
    <div>
      <Topbar title="Messages" subtitle="Reminders and notices over WhatsApp or SMS" />

      <div className="space-y-6">
        {feedback && (
          <p role="status" className="flex items-start gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {feedback}
          </p>
        )}
        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <Panel title="Send a reminder">
          <form onSubmit={handleSend} className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <SelectField
                  id="msgCustomer"
                  label="Customer"
                  value={customerId}
                  onValueChange={setCustomerId}
                  placeholder={customers.length ? undefined : "No customers yet"}
                  options={customers.map((c) => ({
                    value: c._id,
                    label: `${c.code} — ${c.name}`,
                  }))}
                />
              </div>
              <SelectField
                id="msgChannel"
                label="Channel"
                value={channel}
                onValueChange={(v) => setChannel(v as "WHATSAPP" | "SMS")}
                options={[
                  { value: "WHATSAPP", label: "WhatsApp" },
                  { value: "SMS", label: "SMS" },
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="msgBody">Message body</Label>
              <Textarea
                id="msgBody"
                rows={4}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Hello, a reminder about your chair rental booking and outstanding balance…"
              />
              <p className="text-xs text-slate-500">
                WhatsApp sends must match an approved template when the provider is
                configured; free-form text works in log mode.
              </p>
            </div>

            <Button type="submit" disabled={!customerId || !body.trim()}>
              <Send aria-hidden />
              Send reminder
            </Button>
          </form>
        </Panel>

        <Panel
          title="Delivery log"
          action={
            loading
              ? "Loading…"
              : messages.length
                ? `${messages.length} messages · ${failedCount} failed`
                : undefined
          }
        >
          <DataTable
            caption="Every outbound message"
            columns={columns}
            rows={messages}
            rowKey={(d) => d._id}
            emptyText="No messages sent yet."
          />
        </Panel>
      </div>
    </div>
  );
}
