// Period picker used by the dashboard and reports: quick ranges plus a
// custom "from … to …" range. Calls back with concrete dates.
import { useState } from "react";
import { CalendarRange } from "lucide-react";
import SelectField from "../forms/SelectField";
import { Input } from "@/components/ui/input";
import { rangeFor, type Period, type PeriodValue } from "./period";

const OPTIONS = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];

interface PeriodFilterProps {
  value: PeriodValue;
  onChange: (next: PeriodValue) => void;
  today: string;
}

export default function PeriodFilter({ value, onChange, today }: PeriodFilterProps) {
  const [open, setOpen] = useState(false);

  function selectPeriod(period: Period) {
    if (period === "custom") {
      setOpen(true);
      onChange({ period, from: value.from, to: value.to });
      return;
    }
    setOpen(false);
    onChange(rangeFor(period, today));
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <SelectField
        id="period-filter"
        label="Period"
        value={open ? "custom" : value.period}
        onValueChange={(v) => selectPeriod(v as Period)}
        options={OPTIONS}
        className="w-44"
      />
      {(open || value.period === "custom") && (
        <>
          <div>
            <label htmlFor="period-from" className="mb-1.5 block text-sm font-medium">
              From
            </label>
            <Input
              id="period-from"
              type="date"
              value={value.from}
              max={value.to}
              onChange={(e) => onChange({ ...value, period: "custom", from: e.target.value })}
              className="w-40"
            />
          </div>
          <div>
            <label htmlFor="period-to" className="mb-1.5 block text-sm font-medium">
              To
            </label>
            <Input
              id="period-to"
              type="date"
              value={value.to}
              min={value.from}
              onChange={(e) => onChange({ ...value, period: "custom", to: e.target.value })}
              className="w-40"
            />
          </div>
        </>
      )}
      {!open && value.period !== "custom" && (
        <span className="flex items-center gap-1.5 pb-2.5 text-xs text-slate-500">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden />
          {value.from} → {value.to}
        </span>
      )}
    </div>
  );
}
