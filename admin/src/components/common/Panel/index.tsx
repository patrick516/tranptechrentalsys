// A plain white section with a thin grey border and an optional heading row.
// Use it for any block of content so every page looks the same.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  title?: string;
  action?: ReactNode; // small text or a button on the right of the heading
  className?: string;
  children: ReactNode;
}

export default function Panel({ title, action, className, children }: PanelProps) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-brand-navy">{title}</h2>}
          {action && <div className="text-sm text-slate-500">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
