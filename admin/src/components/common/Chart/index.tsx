import React from "react";

export interface BarDatum {
  label: string;
  value: number;
}

interface ChartProps {
  title: string;
  items: BarDatum[];
}

export default function Chart({ title, items }: ChartProps) {
  const maxVal = Math.max(1, ...items.map((i) => Number(i.value) || 0));

  return (
    <div className="rounded-lg border border-brand-blue bg-white p-4">
      <h3 className="text-sm font-bold text-brand-navy">{title}</h3>
      <div className="mt-3 space-y-2.5">
        {items.length === 0 ? (
          <div className="text-xs text-brand-navy/70">
            No chart data available.
          </div>
        ) : (
          items.map((item) => {
            const pct = Math.min(
              100,
              Math.round(((Number(item.value) || 0) / maxVal) * 100),
            );
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="font-mono text-brand-navy">
                    {item.label}
                  </span>
                  <span className="font-bold text-brand-blue">
                    {item.value}
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-brand-blue/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-green"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
