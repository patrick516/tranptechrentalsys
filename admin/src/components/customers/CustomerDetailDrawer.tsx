// Side panel with one customer's balance, contacts, bookings, payments,
// ledger and interaction history. Built on the shadcn Sheet.
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { customersApi } from "../../api/customers";
import { interactionsApi } from "../../api/interactions";
import { formatMK } from "../../lib/format";
import type { CustomerDetail, InteractionItem } from "../../types/customer";
import CustomerStatus from "./CustomerStatus";
import LogInteractionDialog, { type LogInteractionPayload } from "./LogInteractionDialog";
import { typeLabel } from "./customerOptions";
import {
  BookingsSection,
  ContactsSection,
  InteractionsSection,
  LedgerSection,
  PaymentsSection,
} from "./CustomerDetailSections";

interface CustomerDetailDrawerProps {
  customerId: string | null;
  onClose: () => void;
}

export default function CustomerDetailDrawer({ customerId, onClose }: CustomerDetailDrawerProps) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [interactions, setInteractions] = useState<InteractionItem[]>([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const latest = useRef(0); // ignores answers that arrive after a newer request

  const load = useCallback(async (id: string) => {
    const ticket = ++latest.current;
    setLoading(true);
    try {
      const [detailRes, interactionsRes] = await Promise.all([customersApi.get(id), interactionsApi.list(id)]);
      if (ticket !== latest.current) return;
      setError("");
      setDetail(detailRes.data);
      setInteractions(interactionsRes.data || []);
    } catch (err) {
      if (ticket === latest.current) setError(err instanceof Error ? err.message : "Failed to load the customer");
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }, []);

  // The parent remounts the drawer for each customer, so the state above is
  // already empty when this runs.
  useEffect(() => {
    if (!customerId) return;
    load(customerId);
  }, [customerId, load]);

  async function logInteraction(payload: LogInteractionPayload) {
    if (!customerId) return;
    await interactionsApi.create({ customerId, ...payload });
    setFeedback("Interaction saved.");
    await load(customerId);
  }

  const customer = detail?.customer;

  return (
    <Sheet open={customerId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="pr-8">
          <p className="text-xs tabular-nums text-slate-500">{customer?.code ?? "\u00a0"}</p>
          <SheetTitle>{customer?.name ?? "Customer"}</SheetTitle>
          <SheetDescription>
            {customer ? `${typeLabel(customer.type)} · ${customer.area || "No area"}` : "Loading…"}
          </SheetDescription>
        </SheetHeader>

        {!detail ? (
          error ? (
            <p role="alert" className="mt-6 flex flex-wrap items-start gap-x-2 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
              {customerId && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setError("");
                    void load(customerId);
                  }}
                  className="font-medium underline underline-offset-2 disabled:opacity-60"
                >
                  {loading ? "Retrying…" : "Try again"}
                </button>
              )}
            </p>
          ) : (
            <p role="status" className="mt-6 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading customer…
            </p>
          )
        ) : (
          <div className="mt-6 space-y-8">
            {feedback && (
              <p role="status" className="flex items-start gap-2 text-sm text-green-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {feedback}
              </p>
            )}

            <div className="flex items-end justify-between gap-4 border-y border-slate-200 py-4">
              <div>
                <p className="text-sm text-slate-500">Current balance</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMK(detail.balance)}</p>
              </div>
              <CustomerStatus status={detail.customer.status} />
            </div>

            <ContactsSection contacts={detail.customer.contacts ?? []} />
            <BookingsSection bookings={detail.bookings ?? []} />
            <PaymentsSection payments={detail.payments ?? []} />
            <LedgerSection entries={detail.ledgerEntries ?? []} />
            <InteractionsSection items={interactions} onLog={() => setLogOpen(true)} />
          </div>
        )}

        <LogInteractionDialog
          key={logOpen ? "open" : "closed"}
          open={logOpen}
          onOpenChange={setLogOpen}
          customerName={customer?.name ?? "this customer"}
          onLog={logInteraction}
        />
      </SheetContent>
    </Sheet>
  );
}
