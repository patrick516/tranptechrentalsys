// Navigation layout styled with TranpTech brand navy (#101D29), blue (#005098), green (#289030), and white (#FFFFFF)
import React from "react";
import { useAuth } from "../context/AuthContext";

export type AdminNavId =
  | "dashboard"
  | "today"
  | "bookings"
  | "customers"
  | "stock"
  | "payments"
  | "promises"
  | "messages"
  | "reports"
  | "files"
  | "settings";

const NAV_ITEMS: { id: AdminNavId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "today", label: "Today" },
  { id: "bookings", label: "Bookings" },
  { id: "customers", label: "Customers" },
  { id: "stock", label: "Stock" },
  { id: "payments", label: "Payments & Ledger" },
  { id: "promises", label: "Promises" },
  { id: "messages", label: "Messages" },
  { id: "reports", label: "Reports" },
  { id: "files", label: "Files & Exports" },
  { id: "settings", label: "Settings" },
];

interface AdminLayoutProps {
  activeTab: AdminNavId;
  onSelectTab: (tab: AdminNavId) => void;
  children: React.ReactNode;
}

export default function AdminLayout({
  activeTab,
  onSelectTab,
  children,
}: AdminLayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-white text-brand-navy font-sans flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-brand-navy text-white p-4 flex flex-col justify-between">
        <div>
          <div className="px-2 py-1">
            <div className="text-base font-bold tracking-tight text-white">
              TranpTech Rentals
            </div>
            <div className="text-xs text-brand-green font-medium">
              Blantyre • MK Ledger
            </div>
          </div>

          <nav className="mt-4 flex md:flex-col gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
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
        </div>

        <div className="mt-6 pt-4 border-t border-brand-blue/50 px-2">
          <div className="text-xs font-semibold text-white truncate">
            {user?.name}
          </div>
          <div className="text-xs text-brand-green">{user?.role}</div>
          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full rounded-md border border-brand-blue bg-transparent px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-white p-4 md:p-6 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
