import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import Sidebar from "../components/layout/Sidebar";
import GlobalTopbar from "../components/layout/GlobalTopbar";
import { NAV_GROUPS, type AdminNavId } from "../components/layout/nav";

// Keep this export for other files that import the navigation type.
export type { AdminNavId } from "../components/layout/nav";

interface AdminLayoutProps {
  activeTab: AdminNavId;
  onSelectTab: (tab: AdminNavId) => void;
  children: React.ReactNode;
}

interface PanelProps {
  activeTab: AdminNavId;
  onSelectTab: (tab: AdminNavId) => void;
  onClose?: () => void;
  closeRef?: React.Ref<HTMLButtonElement>;
}

// Navigation-only sidebar, shared by desktop and mobile.
function SidebarPanel({
  activeTab,
  onSelectTab,
  onClose,
  closeRef,
}: PanelProps) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-start justify-between px-5 pb-4 pt-5">
        <div>
          <img
            src="/images/RentalsLogo.png"
            alt="TranpTech Rentals"
            width={120}
            height={60}
            className="h-10 w-auto"
          />
          <p className="mt-1 text-xs text-slate-500">
            Blantyre &middot; MK Ledger
          </p>
        </div>

        {onClose && (
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <Sidebar
          groups={NAV_GROUPS}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
        />
      </div>

      {/* No user profile or sign-out section here. */}
      <div className="border-t border-slate-100 px-5 py-3">
        <p className="truncate text-xs text-slate-400">
          TranpTech Rentals Administration
        </p>
      </div>
    </div>
  );
}

export default function AdminLayout({
  activeTab,
  onSelectTab,
  children,
}: AdminLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Mobile navigation: Escape handling, focus management and scroll lock.
  useEffect(() => {
    if (!menuOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  function selectTab(tab: AdminNavId) {
    onSelectTab(tab);
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-white font-sans text-brand-navy">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:border focus:border-slate-300 focus:bg-white focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      <div className="md:ml-64">
        <GlobalTopbar onMenuClick={() => setMenuOpen(true)} />
      </div>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <SidebarPanel activeTab={activeTab} onSelectTab={onSelectTab} />
      </aside>

      {/* Mobile slide-in navigation */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 h-full w-full bg-black/30"
          />

          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl"
          >
            <SidebarPanel
              activeTab={activeTab}
              onSelectTab={selectTab}
              onClose={() => setMenuOpen(false)}
              closeRef={closeRef}
            />
          </div>
        </div>
      )}

      {/* Main page content */}
      <main id="main" className="min-w-0 pt-16 md:pl-64">
        <div className="mx-auto w-full max-w-7xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
