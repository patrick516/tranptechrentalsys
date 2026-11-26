import React from "react";
import { cn } from "../../../lib/utils";

interface StatsCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  accent?: "blue" | "green";
  className?: string;
}

export default function StatsCard({
  label,
  value,
  subtext,
  accent = "blue",
  className,
}: StatsCardProps) {
  const borderClass =
    accent === "green" ? "border-brand-green" : "border-brand-blue";
  const labelClass =
    accent === "green" ? "text-brand-green" : "text-brand-blue";

  return (
    <div
      className={cn("rounded-lg border bg-white p-4", borderClass, className)}
    >
      <div className={cn("text-xs font-semibold", labelClass)}>{label}</div>
      <div className="mt-1 text-2xl font-bold text-brand-navy">{value}</div>
      {subtext && (
        <div className="mt-1 text-xs text-brand-navy/75">{subtext}</div>
      )}
    </div>
  );
}
