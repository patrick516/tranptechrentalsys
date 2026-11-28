// Navigation items for the admin portal: one place to change names, order and icons.
import {
  LayoutDashboard,
  Sun,
  ClipboardList,
  Users,
  Armchair,
  Wallet,
  CalendarClock,
  MessageSquare,
  BarChart3,
  FolderOpen,
  Settings,
  type LucideIcon,
} from "lucide-react";

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

export interface NavItem {
  id: AdminNavId;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label?: string; // small heading above the group (optional)
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "today", label: "Today", icon: Sun },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "bookings", label: "Bookings", icon: ClipboardList },
      { id: "customers", label: "Customers", icon: Users },
      { id: "stock", label: "Stock", icon: Armchair },
    ],
  },
  {
    label: "Money",
    items: [
      { id: "payments", label: "Payments & Ledger", icon: Wallet },
      { id: "promises", label: "Promises", icon: CalendarClock },
    ],
  },
  {
    label: "Records",
    items: [
      { id: "messages", label: "Messages", icon: MessageSquare },
      { id: "reports", label: "Reports", icon: BarChart3 },
      { id: "files", label: "Files & Exports", icon: FolderOpen },
    ],
  },
  {
    label: "System",
    items: [{ id: "settings", label: "Settings", icon: Settings }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
