// Catalogue of WhatsApp templates.
//
// `name` is the template name approved in WhatsApp Manager (Meta).
// `vars` is the ordered variable list — the order Meta expects, {{1}}, {{2}} …
// `fallback` renders the same meaning as a free-text message for wa.me links
// and for the message history row.
//
// SMS template keys from Appendix B are mapped in ALIASES below, so any place
// that already knows an SMS key can ask for the WhatsApp equivalent.

const fmt = (n) => Number(n || 0).toLocaleString("en-US");

const TEMPLATES = {
  BOOKING_CONFIRMATION: {
    name: "booking_confirmation",
    vars: ["contact", "bookingNo", "qty", "start", "end", "total"],
    fallback: (v) =>
      `Hello ${v.contact || "Customer"}, your booking ${v.bookingNo || ""} for ${v.qty || ""} chairs is confirmed from ${v.start || ""} to ${v.end || ""}. Total: MK${fmt(v.total)}. Thank you, TranpTech Chair Rentals.`,
  },
  PAYMENT_RECEIPT: {
    name: "payment_receipt",
    vars: ["contact", "amount", "bookingNo", "date", "receiptNo", "balance"],
    fallback: (v) =>
      `Hello ${v.contact || "Customer"}, we received MK${fmt(v.amount)} for booking ${v.bookingNo || ""} on ${v.date || ""}. Receipt no. ${v.receiptNo || ""}. Balance: MK${fmt(v.balance)}. Thank you.`,
  },
  CHAIRS_DELIVERED: {
    name: "chairs_delivered",
    vars: ["contact", "qty", "bookingNo", "deliveredDate", "dueDate"],
    fallback: (v) =>
      `Hello ${v.contact || "Customer"}, ${v.qty || ""} chairs for booking ${v.bookingNo || ""} were delivered on ${v.deliveredDate || ""}. They are due back on ${v.dueDate || ""}.`,
  },
  RETURN_DUE_REMINDER: {
    name: "return_due_reminder",
    vars: ["contact", "qty", "bookingNo", "dueDate", "balance"],
    fallback: (v) =>
      `Hello ${v.contact || "Customer"}, a reminder that ${v.qty || ""} chairs for booking ${v.bookingNo || ""} are due back on ${v.dueDate || ""}. Current balance: MK${fmt(v.balance)}.`,
  },
  PAYMENT_REMINDER: {
    name: "payment_reminder",
    vars: ["contact", "bookingNo", "balance", "dueDate", "payInfo"],
    fallback: (v) =>
      `Hello ${v.contact || "Customer"}, booking ${v.bookingNo || ""} has an unpaid balance of MK${fmt(v.balance)} that was due on ${v.dueDate || ""}. Please pay or contact us to agree a plan. Payment details: ${v.payInfo || ""}`,
  },
  OVERDUE_NOTICE: {
    name: "overdue_notice",
    vars: ["contact", "bookingNo", "daysLate", "balance", "lateFees", "ownerPhone"],
    fallback: (v) =>
      `Hello ${v.contact || "Customer"}, booking ${v.bookingNo || ""} is ${v.daysLate || ""} days overdue. Balance: MK${fmt(v.balance)}, including late fees of MK${fmt(v.lateFees)}. Please contact us today on ${v.ownerPhone || ""}.`,
  },
  PROMISE_REMINDER: {
    name: "promise_reminder",
    vars: ["contact", "amount", "promisedDate", "bookingNo"],
    fallback: (v) =>
      `Hello ${v.contact || "Customer"}, you agreed to pay MK${fmt(v.amount)} by ${v.promisedDate || ""} for booking ${v.bookingNo || ""}. Please confirm your payment or contact us. Thank you.`,
  },
};

// Internal (SMS) template key -> WhatsApp template key.
const ALIASES = {
  CUSTOM: null,
  BALANCE_DUE: "PAYMENT_REMINDER",
  BOOKING_CONFIRMED: "BOOKING_CONFIRMATION",
  BOOKING_CONFIRMATION: "BOOKING_CONFIRMATION",
  RECEIPT: "PAYMENT_RECEIPT",
  PAYMENT_RECEIPT: "PAYMENT_RECEIPT",
  DELIVERED: "CHAIRS_DELIVERED",
  CHAIRS_DELIVERED: "CHAIRS_DELIVERED",
  DUE_SOON: "RETURN_DUE_REMINDER",
  DUE_TODAY: "RETURN_DUE_REMINDER",
  RETURN_DUE: "RETURN_DUE_REMINDER",
  RETURN_REMINDER: "RETURN_DUE_REMINDER",
  PAYMENT_REMINDER: "PAYMENT_REMINDER",
  OVERDUE_1: "OVERDUE_NOTICE",
  OVERDUE_2: "OVERDUE_NOTICE",
  OVERDUE_3: "OVERDUE_NOTICE",
  OVERDUE_4: "OVERDUE_NOTICE",
  OVERDUE_WEEKLY: "OVERDUE_NOTICE",
  PROMISE_DUE: "PROMISE_REMINDER",
  PROMISE_REMINDER: "PROMISE_REMINDER",
};

function resolveTemplateKey(key) {
  if (Object.prototype.hasOwnProperty.call(ALIASES, key)) {
    return ALIASES[key];
  }
  return Object.prototype.hasOwnProperty.call(TEMPLATES, key) ? key : null;
}

module.exports = { TEMPLATES, ALIASES, resolveTemplateKey };
