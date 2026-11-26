// Drawer displaying customer balance, bookings, ledger entries, payments, and logged interactions
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { formatMK, todayBlantyre } from "../../lib/format";

interface CustomerDetailPayload {
  customer: {
    _id: string;
    code: string;
    name: string;
    type: string;
    status: string;
    area: string;
    contacts: {
      name: string;
      phone: string;
      network?: string;
      isPrimary?: boolean;
    }[];
  };
  balance: number;
  bookings: {
    _id: string;
    code: string;
    status: string;
    startDate: string;
    endDate: string;
    qty: number;
  }[];
  ledgerEntries: {
    _id: string;
    date: string;
    type: string;
    amount: number;
    description: string;
    voidedAt?: string | null;
  }[];
  payments: {
    _id: string;
    paidDate: string;
    amount: number;
    method: string;
    status: string;
  }[];
}

interface InteractionItem {
  _id: string;
  channel: string;
  summary: string;
  followUpDate?: string | null;
  createdAt: string;
}

interface CustomerDetailDrawerProps {
  customerId: string | null;
  onClose: () => void;
}

export default function CustomerDetailDrawer({
  customerId,
  onClose,
}: CustomerDetailDrawerProps) {
  const today = todayBlantyre();
  const [detail, setDetail] = useState<CustomerDetailPayload | null>(null);
  const [interactions, setInteractions] = useState<InteractionItem[]>([]);
  const [channel, setChannel] = useState<
    "PHONE" | "WHATSAPP" | "SMS" | "VISIT" | "OTHER"
  >("WHATSAPP");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadDetail(id: string) {
    setLoading(true);
    try {
      const [detRes, intRes] = await Promise.all([
        apiRequest<{ data: CustomerDetailPayload }>(`/customers/${id}`),
        apiRequest<{ data: InteractionItem[] }>(
          `/interactions?customerId=${encodeURIComponent(id)}`,
        ),
      ]);
      setDetail(detRes.data);
      setInteractions(intRes.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (customerId) {
      loadDetail(customerId);
    }
  }, [customerId]);

  async function handleLogInteraction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customerId || !summary.trim()) return;
    await apiRequest("/interactions", {
      method: "POST",
      body: {
        customerId,
        channel,
        summary: summary.trim(),
        followUpDate: today,
      },
    });
    setSummary("");
    await loadDetail(customerId);
  }

  if (!customerId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-brand-navy/40 font-sans text-brand-navy">
      <div className="w-full max-w-2xl bg-white h-full overflow-y-auto p-6 border-l border-brand-blue space-y-6">
        <div className="flex items-start justify-between border-b border-brand-blue/30 pb-4">
          <div>
            <div className="text-xs font-mono text-brand-blue">
              {detail?.customer.code}
            </div>
            <h2 className="text-xl font-bold text-brand-navy">
              {detail?.customer.name || "Customer Details"}
            </h2>
            <p className="text-xs text-brand-navy/75">
              Status: <strong>{detail?.customer.status}</strong> • Area:{" "}
              {detail?.customer.area || "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-brand-blue px-3 py-1 text-xs font-semibold text-brand-navy hover:bg-brand-navy hover:text-white"
          >
            Close
          </button>
        </div>

        {loading || !detail ? (
          <div className="text-sm text-brand-navy">
            Loading customer statement...
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-brand-green bg-white p-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-brand-navy">
                Current Ledger Balance
              </span>
              <span className="text-xl font-bold text-brand-blue">
                {formatMK(detail.balance)}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-brand-navy">Contacts</h3>
              <ul className="mt-2 space-y-1 text-xs">
                {detail.customer.contacts?.map((ct, idx) => (
                  <li key={idx} className="font-mono">
                    {ct.name} — {ct.phone} ({ct.network || "OTHER"}){" "}
                    {ct.isPrimary ? "[Primary]" : ""}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-brand-navy">
                Bookings ({detail.bookings.length})
              </h3>
              <div className="mt-2 space-y-1.5 text-xs">
                {detail.bookings.map((b) => (
                  <div
                    key={b._id}
                    className="rounded border border-brand-blue/20 px-3 py-2 flex justify-between"
                  >
                    <span>
                      <strong>{b.code}</strong> ({b.startDate} → {b.endDate}) •{" "}
                      {b.qty} chairs
                    </span>
                    <span className="font-semibold text-brand-blue">
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-brand-navy">
                Log Interaction
              </h3>
              <form
                onSubmit={handleLogInteraction}
                className="mt-2 flex flex-col sm:flex-row gap-2"
              >
                <select
                  value={channel}
                  onChange={(e) =>
                    setChannel(
                      e.target.value as
                        | "PHONE"
                        | "WHATSAPP"
                        | "SMS"
                        | "VISIT"
                        | "OTHER",
                    )
                  }
                  className="rounded-md border border-brand-blue px-2.5 py-1.5 text-xs"
                >
                  <option value="WHATSAPP">WHATSAPP</option>
                  <option value="PHONE">PHONE</option>
                  <option value="SMS">SMS</option>
                  <option value="VISIT">VISIT</option>
                  <option value="OTHER">OTHER</option>
                </select>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Call or WhatsApp summary..."
                  className="flex-1 rounded-md border border-brand-blue px-3 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  className="rounded-md bg-brand-blue px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-navy"
                >
                  Log
                </button>
              </form>

              <div className="mt-3 space-y-1.5 text-xs">
                {interactions.map((item) => (
                  <div
                    key={item._id}
                    className="rounded border border-brand-blue/15 px-3 py-2"
                  >
                    <span className="font-bold text-brand-green">
                      [{item.channel}]
                    </span>{" "}
                    {item.summary}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
