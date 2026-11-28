// Customer status as text with a small dot (no coloured badge background).
import { cn } from "@/lib/utils";

const STYLES: Record<string, { label: string; dot: string; text: string }> = {
  ACTIVE: { label: "Active", dot: "bg-green-600", text: "text-slate-700" },
  WATCHLIST: { label: "Watchlist", dot: "bg-amber-500", text: "text-amber-700" },
  BLOCKED: { label: "Blocked", dot: "bg-red-600", text: "text-red-700" },
};

function titleCase(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "Unknown";
}

export default function CustomerStatus({ status }: { status: string }) {
  const style = STYLES[String(status).toUpperCase()] ?? {
    label: titleCase(String(status)),
    dot: "bg-slate-400",
    text: "text-slate-700",
  };
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", style.text)}>
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}
