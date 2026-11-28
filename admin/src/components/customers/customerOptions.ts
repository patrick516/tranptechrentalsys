// Lists and labels shared by the customer forms and the table.
import type { CustomerStatus } from "../../types";
import type { CustomerType, InteractionChannel } from "../../types/customer";

export const CUSTOMER_TYPES: { value: CustomerType; label: string }[] = [
  { value: "BUSINESS", label: "Business" },
  { value: "SCHOOL", label: "School" },
  { value: "CHURCH", label: "Church" },
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "OTHER", label: "Other" },
];

export const STATUS_OPTIONS: { value: CustomerStatus; label: string; note: string }[] = [
  { value: "ACTIVE", label: "Active", note: "Can book chairs as normal." },
  { value: "WATCHLIST", label: "Watchlist", note: "Handle with care. A deposit may be required." },
  { value: "BLOCKED", label: "Blocked", note: "New bookings may be refused." },
];

export const CHANNELS: { value: InteractionChannel; label: string }[] = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "PHONE", label: "Phone call" },
  { value: "SMS", label: "SMS" },
  { value: "VISIT", label: "Visit" },
  { value: "OTHER", label: "Other" },
];

const labelOf = (list: { value: string; label: string }[], value: string) =>
  list.find((item) => item.value === value)?.label ?? value;

export const typeLabel = (type: string) => labelOf(CUSTOMER_TYPES, type);
export const channelLabel = (channel: string) => labelOf(CHANNELS, channel);
