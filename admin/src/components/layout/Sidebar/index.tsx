// Navigation list. White background; the active page is shown with a blue
// text colour and a thin blue marker on the left edge (no filled background).
import { cn } from "@/lib/utils";
import type { AdminNavId, NavGroup } from "../nav";

interface SidebarProps {
  groups: NavGroup[];
  activeTab: AdminNavId;
  onSelectTab: (tab: AdminNavId) => void;
}

export default function Sidebar({ groups, activeTab, onSelectTab }: SidebarProps) {
  return (
    <nav aria-label="Main" className="space-y-6">
      {groups.map((group, index) => (
        <div key={group.label ?? index}>
          {group.label && (
            <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-slate-500">
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = activeTab === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-r-md border-l-2 px-3 py-2 text-left text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                      active
                        ? "border-primary font-semibold text-primary"
                        : "border-transparent font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-navy"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
