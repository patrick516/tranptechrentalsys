// Shapes used by the Customers page, its dialogs and the detail drawer.
import type { BookingStatus, Customer } from "./index";

export type CustomerType = "SCHOOL" | "CHURCH" | "INDIVIDUAL" | "BUSINESS" | "OTHER";
export type InteractionChannel = "PHONE" | "WHATSAPP" | "SMS" | "VISIT" | "OTHER";

// GET /customers/:id
export interface CustomerDetail {
  customer: Customer;
  balance: number;
  bookings: {
    _id: string;
    code: string;
    status: BookingStatus;
    startDate: string;
    endDate: string;
    qty: number;
  }[];
  ledgerEntries: {
    _id: string;
    date: string;
    type: string;
    amount: number;
    description: string;
    voidedAt?: string | null;
  }[];
  payments: {
    _id: string;
    paidDate: string;
    amount: number;
    method: string;
    status: string;
  }[];
}

// GET /interactions?customerId=...
export interface InteractionItem {
  _id: string;
  channel: InteractionChannel | string;
  summary: string;
  followUpDate?: string | null;
  createdAt: string;
}
