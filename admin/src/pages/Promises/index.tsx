// Promises: what a customer committed to, and whether they kept it.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { apiRequest } from "../../api/client";
import { formatMK, todayBlantyre } from "../../lib/format";
import Topbar from "../../components/layout/Topbar";
import Panel from "../../components/common/Panel";
import DataTable, { type Column } from "../../components/common/DataTable";
import SelectField from "../../components/forms/SelectField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerRef {
  _id: string;
  code: string;
  name: string;
}

interface BookingRef {
  _id: string;
  code: string;
  status: string;
}

interface PromiseItem {
  _id: string;
  customerId: CustomerRef | string;
  bookingId?: BookingRef | string | null;
  kind: "PAYMENT" | "RETURN";
  promisedDate: string;
  promisedAmount?: number | null;
  status: "PENDING" | "KEPT" | "BROKEN" | "CANCELLED";
  notes: string;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  KEPT: "border-emerald-200 bg-emerald-50 text-emerald-700",
  BROKEN: "border-red-200 bg-red-50 text-red-700",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-600",
};

function customerLabel(c: CustomerRef | string): string {
  return typeof c === "string" ? c : `${c.code} · ${c.name}`;
}

export default function PromisesPage() {
  const today = todayBlantyre();
  const [customers, setCustomers] = useState<CustomerRef[]>([]);
  const [promises, setPromises] = useState<PromiseItem[]>([]);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [kind, setKind] = useState<"PAYMENT" | "RETURN">("PAYMENT");
  const [promisedDate, setPromisedDate] = useState(today);
  const [promisedAmount, setPromisedAmount] = useState("20000");
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = overdueOnly ? "?overdue=true" : "";
      const [custRes, promRes] = await Promise.all([
        apiRequest<{ data: CustomerRef[] }>("/customers"),
        apiRequest<{ data: PromiseItem[] }>(`/promises${query}`),
      ]);
      const custs = custRes.data || [];
      setCustomers(custs);
      setPromises(promRes.data || []);
      setCustomerId((prev) => prev || custs[0]?._id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load promises");
    } finally {
      setLoading(false);
    }
  }, [overdueOnly]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreatePromise(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback("");
    setError("");
    try {
      const parsedAmount =
        kind === "PAYMENT" && promisedAmount.trim() !== "" ? Number(promisedAmount) : null;
      await apiRequest("/promises", {
        method: "POST",
        body: { customerId, kind, promisedDate, promisedAmount: parsedAmount, notes },
      });
      setFeedback("Recorded customer promise.");
      setNotes("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create promise");
    }
  }

  async function handleStatusUpdate(id: string, status: PromiseItem["status"]) {
    setFeedback("");
    setError("");
    try {
      await apiRequest(`/promises/${id}/status`, { method: "PATCH", body: { status } });
      setFeedback(`Marked promise as ${status.toLowerCase()}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update promise status");
    }
  }

  const columns: Column<PromiseItem>[] = [
    { key: "customer", header: "Customer", render: (d) => <span className="font-medium">{customerLabel(d.customerId)}</span> },
    { key: "kind", header: "Kind", render: (d) => <span className="text-slate-600">{d.kind}</span> },
    { key: "promisedDate", header: "Promised for", render: (d) => <span className="tabular-nums">{d.promisedDate}</span> },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (d) => <span className="tabular-nums">{d.promisedAmount ? formatMK(d.promisedAmount) : "–"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (d) => (
        <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[d.status] || ""}`}>
          {d.status}
        </span>
      ),
    },
    { key: "notes", header: "Notes", render: (d) => <span className="text-slate-500">{d.notes || "–"}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (d) =>
        d.status === "PENDING" ? (
          <span className="inline-flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(d._id, "KEPT")}>
              Kept
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(d._id, "BROKEN")}>
              Broken
            </Button>
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
  ];

  const pending = promises.filter((p) => p.status === "PENDING").length;
  const broken = promises.filter((p) => p.status === "BROKEN").length;

  return (
    <div>
      <Topbar
        title="Promises"
        subtitle="Customer commitments for payments and chair returns"
        rightSlot={
          <div className="flex items-center gap-2">
            <input
              id="overdueOnly"
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-brand-blue"
            />
            <Label htmlFor="overdueOnly" className="text-sm font-medium text-slate-700">
              Overdue only
            </Label>
          </div>
        }
      />

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

        <Panel title="New promise">
          <form onSubmit={handleCreatePromise} className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <SelectField
                id="promiseCustomer"
                label="Customer"
                value={customerId}
                onValueChange={setCustomerId}
                placeholder={customers.length ? undefined : "No customers yet"}
                options={customers.map((c) => ({ value: c._id, label: `${c.code} — ${c.name}` }))}
              />
              <SelectField
                id="promiseKind"
                label="Type"
                value={kind}
                onValueChange={(v) => setKind(v as "PAYMENT" | "RETURN")}
                options={[
                  { value: "PAYMENT", label: "Payment" },
                  { value: "RETURN", label: "Chair return" },
                ]}
              />
              <div className="space-y-2">
                <Label htmlFor="promisedDate">Promised for</Label>
                <Input
                  id="promisedDate"
                  type="date"
                  required
                  value={promisedDate}
                  onChange={(e) => setPromisedDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promisedAmount">Amount (MK)</Label>
                <Input
                  id="promisedAmount"
                  type="number"
                  min={1}
                  step={1}
                  disabled={kind === "RETURN"}
                  value={promisedAmount}
                  onChange={(e) => setPromisedAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promiseNotes">Notes</Label>
              <Input
                id="promiseNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What was agreed on the call or WhatsApp"
              />
            </div>

            <Button type="submit" disabled={!customerId}>
              Save promise
            </Button>
          </form>
        </Panel>

        <Panel
          title={overdueOnly ? "Overdue promises" : "All promises"}
          action={`${pending} pending · ${broken} broken`}
        >
          <DataTable
            caption="Customer promises"
            columns={columns}
            rows={promises}
            rowKey={(d) => d._id}
            emptyText="No promises recorded yet."
          />
        </Panel>
      </div>
    </div>
  );
}
