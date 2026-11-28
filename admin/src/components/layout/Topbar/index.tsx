// Page heading: title, optional subtitle and an optional area for action buttons.
import React from "react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export default function Topbar({ title, subtitle, rightSlot }: TopbarProps) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {rightSlot && <div className="flex flex-wrap items-center gap-2">{rightSlot}</div>}
    </header>
  );
}
