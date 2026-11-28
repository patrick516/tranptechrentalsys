// Simple horizontal bars. One colour (brand blue) on a light grey track.
import Panel from "../Panel";

export interface BarDatum {
  label: string;
  value: number;
}

interface ChartProps {
  title: string;
  items: BarDatum[];
  formatValue?: (value: number) => string; // e.g. formatMK for money
  emptyText?: string;
}

export default function Chart({
  title,
  items,
  formatValue = (value) => String(value),
  emptyText = "No data to show yet.",
}: ChartProps) {
  const maxValue = Math.max(1, ...items.map((i) => Number(i.value) || 0));

  return (
    <Panel title={title}>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const value = Number(item.value) || 0;
            const percent = Math.min(100, Math.round((value / maxValue) * 100));
            return (
              <li key={item.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-slate-600">{item.label}</span>
                  <span className="font-semibold tabular-nums text-brand-navy">
                    {formatValue(value)}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={item.label}
                  aria-valuemin={0}
                  aria-valuemax={maxValue}
                  aria-valuenow={value}
                  className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
