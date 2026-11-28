// Shapes returned by the bookings API (shared by the page and the dialogs).

export interface CustomerRef {
  _id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "WATCHLIST" | "BLOCKED";
}

export interface BookingItem {
  _id: string;
  code: string;
  customerId: CustomerRef | string;
  status: "RESERVED" | "OUT" | "RETURNED" | "CANCELLED";
  startDate: string;
  endDate: string;
  qty: number;
  qtyOut: number;
  qtyReturned: number;
  qtyLost: number;
  qtyDamaged: number;
  ratePerChairPerDay: number;
  lateFeePerDay: number;
  venue: string;
}
