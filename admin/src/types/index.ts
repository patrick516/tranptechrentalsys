export type Role = "ADMIN" | "STAFF" | "VIEWER";
export type CustomerStatus = "ACTIVE" | "WATCHLIST" | "BLOCKED";
export type BookingStatus = "RESERVED" | "OUT" | "RETURNED" | "CANCELLED";

export interface Contact {
  _id?: string;
  name: string;
  role?: string;
  phone: string;
  network?: string;
  isPrimary?: boolean;
}

export interface Customer {
  _id: string;
  code: string;
  name: string;
  type: string;
  status: CustomerStatus;
  area?: string;
  contacts: Contact[];
}

export interface Booking {
  _id: string;
  code: string;
  customerId: Customer | string;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  qty: number;
  qtyOut: number;
  ratePerChairPerDay: number;
  lateFeePerDay: number;
}
