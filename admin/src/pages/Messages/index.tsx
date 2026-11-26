// Outbound WhatsApp & SMS reminder sender and message log page
import React, { useEffect, useState, useCallback } from "react";
import { apiRequest } from "../../api/client";

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

export default function MessagesPage() {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [messages, setMessages] = useState<MessageLogRow[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [channel, setChannel] = useState<"WHATSAPP" | "SMS">("WHATSAPP");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [custRes, msgRes] = await Promise.all([
        apiRequest<{ data: CustomerOption[] }>("/customers"),
        apiRequest<{ data: MessageLogRow[] }>("/messages"),
      ]);
      const custs = custRes.data || [];
      setCustomers(custs);
      setMessages(msgRes.data || []);
      if (custs.length > 0) {
        setCustomerId((prev) => prev || custs[0]._id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-500">
          Send reminder notices via WhatsApp or SMS and view delivery logs.
        </p>
      </div>

      {feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          {feedback}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Customer
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as "WHATSAPP" | "SMS")}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="WHATSAPP">WHATSAPP</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Message Body
          </label>
          <textarea
            rows={3}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hello, reminder regarding your chair rental booking and balance..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Send Reminder
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto">
        <h2 className="text-base font-semibold text-slate-900">Message Log</h2>
        <table className="mt-3 w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="py-2">Phone</th>
              <th className="py-2">Network</th>
              <th className="py-2">Channel</th>
              <th className="py-2">Status</th>
              <th className="py-2">Message</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m._id} className="border-b border-slate-100">
                <td className="py-2 font-mono text-xs">{m.toPhone}</td>
                <td className="py-2 text-xs">{m.network}</td>
                <td className="py-2 text-xs">{m.channel}</td>
                <td className="py-2 text-xs font-semibold">{m.status}</td>
                <td className="py-2 text-xs text-slate-600">{m.body}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
