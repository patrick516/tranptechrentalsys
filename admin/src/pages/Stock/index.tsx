// Stock: how many chairs exist, what is free day-by-day, and every movement
// that changed the fleet. Adding chairs and recording movements happen in
// modal dialogs opened from the icon buttons at the top.
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  PackagePlus,
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { todayBlantyre } from "../../lib/format";
import Topbar from "../../components/layout/Topbar";
import Panel from "../../components/common/Panel";
import DataTable, { type Column } from "../../components/common/DataTable";
import FormDialog from "../../components/common/FormDialog";
import FormField from "../../components/forms/FormField";
import SelectField from "../../components/forms/SelectField";
import StatsCard from "../../components/common/StatsCard";
import { BarsChart } from "../../components/charts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AvailabilityDay {
  date: string;
  totalOwned: number;
  reservedOrOut: number;
  available: number;
}

interface AvailabilityReport {
  totalOwned: number;
  minAvailable: number;
  days: AvailabilityDay[];
}

type MovementType =
  | "PURCHASE"
  | "LOST"
  | "DAMAGED"
  | "REPAIRED"
  | "FOUND"
  | "WRITE_OFF";

interface MovementRow {
  _id: string;
  date: string;
  type: MovementType;
  qty: number;
  note: string;
}

interface MovementPayload {
  type: MovementType;
  qty: number;
  date: string;
  note: string;
}

type DialogKind = "add" | "movement";

const MOVEMENT_OPTIONS: { value: MovementType; label: string }[] = [
  { value: "PURCHASE", label: "PURCHASE (+)" },
  { value: "FOUND", label: "FOUND (+)" },
  { value: "REPAIRED", label: "REPAIRED (+)" },
  { value: "LOST", label: "LOST (−)" },
  { value: "DAMAGED", label: "DAMAGED (−)" },
  { value: "WRITE_OFF", label: "WRITE_OFF (−)" },
];

function wholeNumber(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

// ---------------------------------------------------------------------------
// Dialog: add chairs (records a PURCHASE movement)
// ---------------------------------------------------------------------------
function AddChairsDialog({
  open,
  onOpenChange,
  today,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: string;
  onSave: (payload: MovementPayload) => Promise<void>;
}) {
  const [qty, setQty] = useState("50");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");

  const chairs = wholeNumber(qty);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add chairs to inventory"
      description="Records a PURCHASE movement."
      submitLabel="Add chairs"
      submittingLabel="Adding…"
      submitDisabled={chairs === null || !date}
      onSubmit={() =>
        onSave({
          type: "PURCHASE",
          qty: chairs ?? 0,
          date,
          note: note.trim() || "Added chairs to inventory",
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Quantity"
          htmlFor="add-qty"
          error={
            chairs === null ? "Enter a whole number, 1 or more." : undefined
          }
        >
          <Input
            id="add-qty"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </FormField>
        <FormField label="Date" htmlFor="add-date">
          <Input
            id="add-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </FormField>
      </div>
      <FormField
        label="Supplier / batch note"
        htmlFor="add-note"
        hint="Optional."
      >
        <Input
          id="add-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. bought 50 plastic chairs in Limbe"
        />
      </FormField>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Dialog: record any stock movement
// ---------------------------------------------------------------------------
function MovementDialog({
  open,
  onOpenChange,
  today,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: string;
  onSave: (payload: MovementPayload) => Promise<void>;
}) {
  const [type, setType] = useState<MovementType>("PURCHASE");
  const [qty, setQty] = useState("20");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");

  const chairs = wholeNumber(qty);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record a stock movement"
      description="Negative types reduce the fleet."
      submitLabel="Record"
      submittingLabel="Saving…"
      submitDisabled={chairs === null || !date}
      onSubmit={() =>
        onSave({ type, qty: chairs ?? 0, date, note: note.trim() })
      }
    >
      <SelectField
        id="mov-type"
        label="Type"
        value={type}
        onValueChange={(v) => setType(v as MovementType)}
        options={MOVEMENT_OPTIONS}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Quantity"
          htmlFor="mov-qty"
          error={
            chairs === null ? "Enter a whole number, 1 or more." : undefined
          }
        >
          <Input
            id="mov-qty"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </FormField>
        <FormField label="Date" htmlFor="mov-date">
          <Input
            id="mov-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </FormField>
      </div>
      <FormField
        label="Note"
        htmlFor="mov-note"
        hint="Optional reason for the movement."
      >
        <Input
          id="mov-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason for the movement"
        />
      </FormField>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function StockPage() {
  const today = todayBlantyre();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [report, setReport] = useState<AvailabilityReport | null>(null);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [openDialog, setOpenDialog] = useState<DialogKind | null>(null);

  const loadStock = useCallback(async () => {
    setError("");
    try {
      const [availRes, movRes] = await Promise.all([
        apiRequest<{ data: AvailabilityReport }>(
          `/stock/availability?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`,
        ),
        apiRequest<{ data: MovementRow[] }>("/stock/movements"),
      ]);
      setReport(availRes.data);
      setMovements(movRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stock");
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  function openFor(kind: DialogKind) {
    setFeedback("");
    setOpenDialog(kind);
  }

  // The handlers throw on failure: the dialog shows the message itself.
  async function addChairs(payload: MovementPayload) {
    await apiRequest("/stock/movements", { method: "POST", body: payload });
    setFeedback(`Added ${payload.qty} chairs to stock.`);
    void loadStock(); // refresh in the background so the dialog closes right away
  }

  async function recordMovement(payload: MovementPayload) {
    await apiRequest("/stock/movements", { method: "POST", body: payload });
    setFeedback(`Recorded ${payload.type} movement of ${payload.qty} chairs.`);
    void loadStock();
  }

  const days = report?.days || [];
  const chartData = days.slice(-31).map((d) => ({
    label: d.date.slice(5),
    value: d.available,
  }));

  const availabilityColumns: Column<AvailabilityDay>[] = [
    {
      key: "date",
      header: "Date",
      render: (d) => (
        <span className="tabular-nums text-slate-600">{d.date}</span>
      ),
    },
    {
      key: "total",
      header: "Owned",
      align: "right",
      render: (d) => (
        <span className="tabular-nums text-slate-600">{d.totalOwned}</span>
      ),
    },
    {
      key: "out",
      header: "Reserved / out",
      align: "right",
      render: (d) => <span className="tabular-nums">{d.reservedOrOut}</span>,
    },
    {
      key: "available",
      header: "Available",
      align: "right",
      render: (d) => (
        <span
          className={`font-semibold tabular-nums ${d.available === 0 ? "text-red-600" : ""}`}
        >
          {d.available}
        </span>
      ),
    },
  ];

  const movementColumns: Column<MovementRow>[] = [
    {
      key: "date",
      header: "Date",
      render: (d) => (
        <span className="tabular-nums text-slate-600">{d.date}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (d) => (
        <span
          className={`text-slate-700 ${d.type === "LOST" || d.type === "DAMAGED" || d.type === "WRITE_OFF" ? "text-red-600" : ""}`}
        >
          {d.type}
        </span>
      ),
    },
    {
      key: "qty",
      header: "Qty",
      align: "right",
      render: (d) => (
        <span className="font-semibold tabular-nums">{d.qty}</span>
      ),
    },
    {
      key: "note",
      header: "Note",
      render: (d) => <span className="text-slate-500">{d.note || "–"}</span>,
    },
  ];

  return (
    <div>
      <Topbar
        title="Chair stock"
        subtitle="Inventory, day-by-day availability and movement ledger"
        rightSlot={
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label
                htmlFor="stockFrom"
                className="mb-1.5 block text-xs text-slate-500"
              >
                From
              </Label>
              <Input
                id="stockFrom"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label
                htmlFor="stockTo"
                className="mb-1.5 block text-xs text-slate-500"
              >
                To
              </Label>
              <Input
                id="stockTo"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <Button
              type="button"
              size="icon"
              className="h-10 w-10"
              title="Add chairs to inventory"
              aria-label="Add chairs to inventory"
              onClick={() => openFor("add")}
            >
              <PackagePlus aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-10 w-10"
              title="Record a stock movement"
              aria-label="Record a stock movement"
              onClick={() => openFor("movement")}
            >
              <ArrowLeftRight aria-hidden />
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {feedback && (
          <p
            role="status"
            className="flex items-start gap-2 text-sm text-emerald-700"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {feedback}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 text-sm text-red-600"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatsCard label="Chairs owned" value={report?.totalOwned ?? 0} />
          <StatsCard
            label="Free at the worst moment in range"
            value={report?.minAvailable ?? 0}
            subtext={fromDate === toDate ? fromDate : `${fromDate} → ${toDate}`}
          />
          <StatsCard
            label="Movements recorded"
            value={movements.length}
            subtext="lifetime stock ledger"
          />
        </div>

        <Panel
          title="Availability by day"
          action={days.length ? `${fromDate} → ${toDate}` : undefined}
        >
          <div className="p-5">
            <BarsChart
              data={chartData}
              height={280}
              yLegend="chairs free"
              formatValue={(v) => String(v)}
            />
          </div>
          <div className="border-t border-slate-100">
            <DataTable
              caption="Daily availability"
              columns={availabilityColumns}
              rows={days}
              rowKey={(d) => d.date}
              emptyText="No availability data for this range."
            />
          </div>
        </Panel>

        <Panel
          title="Recent stock movements"
          action={`${movements.length} total`}
        >
          <DataTable
            caption="Stock movement ledger"
            columns={movementColumns}
            rows={movements.slice(0, 25)}
            rowKey={(d) => d._id}
            emptyText="No stock movements yet."
          />
        </Panel>
      </div>

      <AddChairsDialog
        key={`add-${openDialog ?? "closed"}`}
        open={openDialog === "add"}
        onOpenChange={(o) => !o && setOpenDialog(null)}
        today={today}
        onSave={addChairs}
      />
      <MovementDialog
        key={`mov-${openDialog ?? "closed"}`}
        open={openDialog === "movement"}
        onOpenChange={(o) => !o && setOpenDialog(null)}
        today={today}
        onSave={recordMovement}
      />
    </div>
  );
}
