// Read-only blocks shown inside the customer drawer. Each one is a simple
// list with thin dividers: no boxes, no coloured fills.
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import BookingStatusBadge from "../bookings/BookingStatusBadge";
import { formatMK } from "../../lib/format";
import type { Contact } from "../../types";
import type { CustomerDetail, InteractionItem } from "../../types/customer";
import { channelLabel } from "./customerOptions";

const LIST = "divide-y divide-slate-100 border-y border-slate-100";
const NETWORKS: Record<string, string> = { AIRTEL: "Airtel", TNM: "TNM", OTHER: "Other" };

// An ISO timestamp as a Blantyre business date (YYYY-MM-DD).
function dateInBlantyre(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Blantyre",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-2 text-sm text-slate-500">{children}</p>;
}

export function ContactsSection({ contacts }: { contacts: Contact[] }) {
  return (
    <Section title="Contacts">
      {contacts.length === 0 ? (
        <Empty>No contacts yet.</Empty>
      ) : (
        <ul className={LIST}>
          {contacts.map((c, i) => (
            <li key={c._id ?? i} className="flex items-start justify-between gap-3 py-2.5 text-sm">
              <div>
                <p className="font-medium">
                  {c.name}
                  {c.isPrimary && <span className="ml-2 text-xs font-normal text-slate-500">Primary</span>}
                </p>
                {c.role && <p className="text-xs text-slate-500">{c.role}</p>}
              </div>
              <div className="text-right">
                <p className="tabular-nums">{c.phone}</p>
                <p className="text-xs text-slate-500">{NETWORKS[c.network ?? "OTHER"] ?? "Other"}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function BookingsSection({ bookings }: { bookings: CustomerDetail["bookings"] }) {
  return (
    <Section title={`Bookings (${bookings.length})`}>
      {bookings.length === 0 ? (
        <Empty>No bookings yet.</Empty>
      ) : (
        <ul className={LIST}>
          {bookings.map((b) => (
            <li key={b._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div>
                <p className="font-medium tabular-nums">{b.code}</p>
                <p className="text-xs tabular-nums text-slate-500">
                  {b.startDate} → {b.endDate} · {b.qty} chairs
                </p>
              </div>
              <BookingStatusBadge status={b.status} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function PaymentsSection({ payments }: { payments: CustomerDetail["payments"] }) {
  const recent = [...payments].sort((a, b) => b.paidDate.localeCompare(a.paidDate)).slice(0, 5);
  return (
    <Section title="Recent payments">
      {recent.length === 0 ? (
        <Empty>No payments yet.</Empty>
      ) : (
        <ul className={LIST}>
          {recent.map((p) => (
            <li key={p._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div>
                <p className="tabular-nums">{p.paidDate}</p>
                <p className="text-xs text-slate-500">
                  {p.method} · {p.status}
                </p>
              </div>
              <p className="font-semibold tabular-nums">{formatMK(p.amount)}</p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function LedgerSection({ entries }: { entries: CustomerDetail["ledgerEntries"] }) {
  const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  return (
    <Section title="Recent ledger entries">
      {recent.length === 0 ? (
        <Empty>No ledger entries yet.</Empty>
      ) : (
        <ul className={LIST}>
          {recent.map((e) => (
            <li key={e._id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
              <div className={e.voidedAt ? "text-slate-400 line-through" : ""}>
                <p>{e.description}</p>
                <p className="text-xs tabular-nums text-slate-500">
                  {e.date} · {e.type}
                </p>
              </div>
              <p className={`tabular-nums ${e.voidedAt ? "text-slate-400 line-through" : "font-medium"}`}>
                {formatMK(e.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function InteractionsSection({ items, onLog }: { items: InteractionItem[]; onLog: () => void }) {
  const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Section
      title="Interactions"
      action={
        <Button size="sm" variant="outline" onClick={onLog}>
          <Plus aria-hidden />
          Log interaction
        </Button>
      }
    >
      {sorted.length === 0 ? (
        <Empty>Nothing logged yet.</Empty>
      ) : (
        <ul className={LIST}>
          {sorted.map((item) => (
            <li key={item._id} className="py-2.5 text-sm">
              <p>{item.summary}</p>
              <p className="text-xs text-slate-500">
                {channelLabel(item.channel)} · {dateInBlantyre(item.createdAt)}
                {item.followUpDate ? ` · follow up ${item.followUpDate}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
