import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Search, UserRound } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

interface GlobalTopbarProps {
  onMenuClick: () => void;
}

export default function GlobalTopbar({ onMenuClick }: GlobalTopbarProps) {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const initials = (name?: string) => {
    const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";

    return (
      parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")
    ).toUpperCase();
  };

  useEffect(() => {
    if (!profileOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileOpen]);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-40 h-16 border-b border-slate-200 bg-white md:left-64">
      <div className="flex h-full items-center justify-between gap-4 px-4 md:px-8">
        {/* Left: mobile menu and search */}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-navy hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:hidden"
          >
            <span className="text-xl">☰</span>
          </button>

          {/* Search UI - backend integration comes next */}
          <div className="relative hidden w-full max-w-md md:block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              disabled
              placeholder="Global search coming soon..."
              aria-label="Global search"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Right: administrator profile */}
        <div className="relative shrink-0" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-lg p-1.5 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:gap-3"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-brand-navy">
              {initials(user?.name)}
            </span>

            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-36 truncate text-sm font-semibold text-brand-navy">
                {user?.name || "Administrator"}
              </span>
              <span className="block text-xs capitalize text-slate-500">
                {user?.role?.toLowerCase() || "Admin"}
              </span>
            </span>

            <ChevronDown
              className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${
                profileOpen ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>

          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-brand-navy">
                    {initials(user?.name)}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-navy">
                      {user?.name || "Administrator"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Role:{" "}
                  <span className="font-medium capitalize text-brand-navy">
                    {user?.role?.toLowerCase() || "Admin"}
                  </span>
                </p>
              </div>

              <div className="p-2">
                <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600">
                  <UserRound className="h-4 w-4" aria-hidden />
                  Account information
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLogout()}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
