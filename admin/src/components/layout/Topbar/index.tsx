import React from "react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export default function Topbar({ title, subtitle, rightSlot }: TopbarProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-blue/20 pb-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">{title}</h1>
        {subtitle && <p className="text-sm text-brand-navy/75">{subtitle}</p>}
      </div>
      {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
    </header>
  );
}
