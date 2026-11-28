// One number with a label. Neutral card: the figure does the talking.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: string | number;
  subtext?: ReactNode;
  // Kept so older pages that still pass it compile. It no longer changes the look.
  accent?: "blue" | "green";
  className?: string;
}

export default function StatsCard({ label, value, subtext, className }: StatsCardProps) {
  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white p-5", className)}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-brand-navy">
        {value}
      </p>
      {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
    </div>
  );
}
