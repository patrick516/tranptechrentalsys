// Stock: how many chairs exist, what is free day-by-day, and every movement
// that changed the fleet.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { apiRequest } from "../../api/client";
import { todayBlantyre } from "../../lib/format";
import Topbar from "../../components/layout/Topbar";
import Panel from "../../components/common/Panel";
import DataTable, { type Column } from "../../components/common/DataTable";
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

interface MovementRow {
  _id: string;
  date: string;
  type: "PURCHASE" | "LOST" | "DAMAGED" | "REPAIRED" | "FOUND" | "WRITE_OFF";
  qty: number;
  note: string;
}

const MOVEMENT_OPTIONS: { value: MovementRow["type"]; label: string }[] = [
  { value: "PURCHASE", label: "PURCHASE (+)" },
  { value: "FOUND", label: "FOUND (+)" },
  { value: "REPAIRED", label: "REPAIRED (+)" },
  { value: "LOST", label: "LOST (−)" },
  { value: "DAMAGED", label: "DAMAGED (−)" },
  { value: "WRITE_OFF", label: "WRITE_OFF (−)" },
];

export default function StockPage() {
  const today = todayBlantyre();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [report, setReport] = useState<AvailabilityReport | null>(null);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const [addChairsQty, setAddChairsQty] = useState(50);
  const [addChairsDate, setAddChairsDate] = useState(today);
  const [addChairsNote, setAddChairsNote] = useState("");

  const [type, setType] = useState<MovementRow["type"]>("PURCHASE");
  const [qty, setQty] = useState(20);
  const [movDate, setMovDate] = useState(today);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

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

  async function handleQuickAddChairs(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback("");
    setError("");
    try {
      await apiRequest("/stock/movements", {
        method: "POST",
        body: {
          type: "PURCHASE",
          qty: Number(addChairsQty),
          date: addChairsDate,
          note: addChairsNote.trim() || "Added chairs to inventory",
        },
      });
      setFeedback(`Added ${Number(addChairsQty)} chairs to stock.`);
      setAddChairsNote("");
      await loadStock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add chairs");
    }
  }

  async function handleAddMovement(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setFeedback("");
    setError("");
    try {
      await apiRequest("/stock/movements", {
        method: "POST",
        body: { type, qty: Number(qty), date: movDate, note: note.trim() },
      });
      setFeedback(`Recorded ${type} movement of ${Number(qty)} chairs.`);
      setNote("");
      await loadStock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record stock movement");
    } finally {
      setSaving(false);
    }
  }

  const days = report?.days || [];
  const chartData = days.slice(-31).map((d) => ({
    label: d.date.slice(5),
    value: d.available,
  }));

  const availabilityColumns: Column<AvailabilityDay>[] = [
    { key: "date", header: "Date", render: (d) => <span className="tabular-nums text-slate-600">{d.date}</span> },
    { key: "total", header: "Owned", align: "right", render: (d) => <span className="tabular-nums text-slate-600">{d.totalOwned}</span> },
    { key: "out", header: "Reserved / out", align: "right", render: (d) => <span className="tabular-nums">{d.reservedOrOut}</span> },
    {
      key: "available",
      header: "Available",
      align: "right",
      render: (d) => (
        <span className={`font-semibold tabular-nums ${d.available === 0 ? "text-red-600" : ""}`}>
          {d.available}
        </span>
      ),
    },
  ];

  const movementColumns: Column<MovementRow>[] = [
    { key: "date", header: "Date", render: (d) => <span className="tabular-nums text-slate-600">{d.date}</span> },
    {
      key: "type",
      header: "Type",
      render: (d) => (
        <span className={`text-slate-700 ${d.type === "LOST" || d.type === "DAMAGED" || d.type === "WRITE_OFF" ? "text-red-600" : ""}`}>
          {d.type}
        </span>
      ),
    },
    { key: "qty", header: "Qty", align: "right", render: (d) => <span className="font-semibold tabular-nums">{d.qty}</span> },
    { key: "note", header: "Note", render: (d) => <span className="text-slate-500">{d.note || "–"}</span> },
  ];

  return (
    <div>
      <Topbar
        title="Chair stock"
        subtitle="Inventory, day-by-day availability and movement ledger"
        rightSlot={
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor="stockFrom" className="mb-1.5 block text-xs text-slate-500">
                From
              </Label>
              <Input id="stockFrom" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="stockTo" className="mb-1.5 block text-xs text-slate-500">
                To
              </Label>
              <Input id="stockTo" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
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

        <Panel title="Add chairs to inventory" action="Records a PURCHASE movement">
          <form onSubmit={handleQuickAddChairs} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="addQty">Quantity</Label>
              <Input
                id="addQty"
                type="number"
                min={1}
                step={1}
                required
                value={addChairsQty}
                onChange={(e) => setAddChairsQty(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addDate">Date</Label>
              <Input
                id="addDate"
                type="date"
                required
                value={addChairsDate}
                onChange={(e) => setAddChairsDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="addNote">Supplier / batch note</Label>
              <Input
                id="addNote"
                value={addChairsNote}
                onChange={(e) => setAddChairsNote(e.target.value)}
                placeholder="e.g. bought 50 plastic chairs in Limbe"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                <Plus aria-hidden />
                Add chairs
              </Button>
            </div>
          </form>
        </Panel>

        <Panel title="Record a stock movement" action="Negative types reduce the fleet">
          <form onSubmit={handleAddMovement} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-6">
            <SelectField
              id="movType"
              label="Type"
              value={type}
              onValueChange={(v) => setType(v as MovementRow["type"])}
              options={MOVEMENT_OPTIONS}
              className="md:col-span-1"
            />
            <div className="space-y-2">
              <Label htmlFor="movQty">Quantity</Label>
              <Input
                id="movQty"
                type="number"
                min={1}
                step={1}
                required
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="movDate">Date</Label>
              <Input
                id="movDate"
                type="date"
                required
                value={movDate}
                onChange={(e) => setMovDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="movNote">Note</Label>
              <Input
                id="movNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for the movement"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="outline" className="w-full" disabled={saving}>
                {saving ? "Saving…" : "Record"}
              </Button>
            </div>
          </form>
        </Panel>

        <Panel title="Availability by day" action={days.length ? `${fromDate} → ${toDate}` : undefined}>
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

        <Panel title="Recent stock movements" action={`${movements.length} total`}>
          <DataTable
            caption="Stock movement ledger"
            columns={movementColumns}
            rows={movements.slice(0, 25)}
            rowKey={(d) => d._id}
            emptyText="No stock movements yet."
          />
        </Panel>
      </div>
    </div>
  );
}
