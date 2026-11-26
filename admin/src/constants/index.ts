export const ROLES = ["ADMIN", "STAFF", "VIEWER"] as const;
export const BOOKING_STATUSES = [
  "RESERVED",
  "OUT",
  "RETURNED",
  "CANCELLED",
] as const;
export const CUSTOMER_STATUSES = ["ACTIVE", "WATCHLIST", "BLOCKED"] as const;
export const PAYMENT_METHODS = [
  "AIRTEL_MONEY",
  "MPAMBA",
  "CASH",
  "BANK",
  "OTHER",
] as const;
