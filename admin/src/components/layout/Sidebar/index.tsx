import React from "react";
import type { AdminNavId } from "../../../layouts/AdminLayout";

export interface SidebarNavItem {
  id: AdminNavId;
  label: string;
}

interface SidebarProps {
  items: SidebarNavItem[];
  activeTab: AdminNavId;
  onSelectTab: (tab: AdminNavId) => void;
}

export default function Sidebar({
  items,
  activeTab,
  onSelectTab,
}: SidebarProps) {
  return (
    <nav className="mt-4 flex md:flex-col gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            className={`px-3 py-2 rounded-md text-left text-sm font-medium whitespace-nowrap transition ${
              active
                ? "bg-brand-blue text-white"
                : "text-white/85 hover:bg-brand-green hover:text-white"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
