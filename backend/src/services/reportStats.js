// Report statistics: one place that reads bookings, ledger, payments and
// stock once and derives every figure the dashboard and reports pages need.
// Pure computation — no HTTP concerns, no writes.
const Booking = require("../models/Booking");
const Customer = require("../models/Customer");
const LedgerEntry = require("../models/LedgerEntry");
const Payment = require("../models/Payment");
const StockMovement = require("../models/StockMovement");
const { calcBalance } = require("./ledger.calc");
const { calcTotalOwned, getEffectiveEndDate } = require("./stock");
const {
  toBusinessDate,
  diffBusinessDays,
  listBusinessDatesInclusive,
} = require("../utils/dates");

const MAX_RANGE_DAYS = 400;

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

function resolveRange({ from, to } = {}) {
  const end = to && dateRe.test(to) ? to : toBusinessDate();
  let start = from && dateRe.test(from) ? from : null;
  if (!start) {
    const d = new Date(`${end}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 29);
    start = d.toISOString().slice(0, 10);
  }
  if (start > end) {
    const err = new Error("`from` must be on or before `to`");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  const days = listBusinessDatesInclusive(start, end);
  if (days.length > MAX_RANGE_DAYS) {
    const err = new Error(`Range too large (max ${MAX_RANGE_DAYS} days)`);
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  return { from: start, to: end, days };
}

// Loads everything the reports need, in four queries.
async function loadFacts() {
  const [bookings, customers, entries, payments, movements] =
    await Promise.all([
      Booking.find({}).lean(),
      Customer.find({}).lean(),
      LedgerEntry.find({ voidedAt: null }).lean(),
      Payment.find({ status: "CONFIRMED" }).lean(),
      StockMovement.find({}).lean(),
    ]);

  const entriesByCustomer = new Map();
  const entriesByBooking = new Map();
  for (const e of entries) {
    const ck = String(e.customerId);
    if (!entriesByCustomer.has(ck)) entriesByCustomer.set(ck, []);
    entriesByCustomer.get(ck).push(e);
    if (e.bookingId) {
      const bk = String(e.bookingId);
      if (!entriesByBooking.has(bk)) entriesByBooking.set(bk, []);
      entriesByBooking.get(bk).push(e);
    }
  }

  const paymentsByCustomer = new Map();
  for (const p of payments) {
    const k = String(p.customerId);
    if (!paymentsByCustomer.has(k)) paymentsByCustomer.set(k, []);
    paymentsByCustomer.get(k).push(p);
  }

  const customersById = new Map(customers.map((c) => [String(c._id), c]));

  return {
    bookings,
    customers,
    customersById,
    entries,
    payments,
    movements,
    entriesByCustomer,
    entriesByBooking,
    paymentsByCustomer,
  };
}

// Business date (YYYY-MM-DD) of a createdAt instant in Africa/Blantyre.
function businessDateOf(dateLike) {
  return toBusinessDate(dateLike);
}

// ---------------------------------------------------------------------------
// Trends: one bucket per day for charts
// ---------------------------------------------------------------------------
function getTrends({ from, to } = {}, facts) {
  const { days } = resolveRange({ from, to });
  const daySet = new Set(days);

  const bucket = () => new Map(days.map((d) => [d, 0]));
  const bookingsCreated = bucket();
  const bookingsValue = bucket();
  const charges = bucket();
  const paymentsIn = bucket();
  const chairsOut = bucket();
  const overdueCount = bucket();

  const today = days[days.length - 1];

  for (const b of facts.bookings) {
    const created = businessDateOf(b.createdAt);
    if (daySet.has(created)) {
      bookingsCreated.set(created, bookingsCreated.get(created) + 1);
      const value = (facts.entriesByBooking.get(String(b._id)) || []).reduce(
        (s, e) => s + (Number(e.amount) || 0),
        0,
      );
      bookingsValue.set(created, bookingsValue.get(created) + value);
    }
  }

  for (const e of facts.entries) {
    if (daySet.has(e.date)) {
      charges.set(e.date, charges.get(e.date) + (Number(e.amount) || 0));
    }
  }

  for (const p of facts.payments) {
    if (daySet.has(p.paidDate)) {
      paymentsIn.set(p.paidDate, paymentsIn.get(p.paidDate) + (Number(p.amount) || 0));
    }
  }

  for (const day of days) {
    let out = 0;
    let overdue = 0;
    for (const b of facts.bookings) {
      if (b.status !== "RESERVED" && b.status !== "OUT") continue;
      const effEnd = getEffectiveEndDate(b, today);
      if (b.startDate <= day && day <= effEnd) {
        const qty = b.status === "OUT" ? Number(b.qtyOut) || 0 : Number(b.qty) || 0;
        out += qty;
        if (b.status === "OUT" && b.endDate < day) overdue += 1;
      }
    }
    chairsOut.set(day, out);
    overdueCount.set(day, overdue);
  }

  const series = {
    bookingsCreated: [],
    bookingsValue: [],
    charges: [],
    payments: [],
    paymentsCumulative: [],
    chargesCumulative: [],
    balanceCumulative: [],
    chairsOut: [],
    overdueCount: [],
  };

  let runPayments = 0;
  let runCharges = 0;
  for (const day of days) {
    runCharges += charges.get(day);
    runPayments += paymentsIn.get(day);
    series.bookingsCreated.push({ date: day, value: bookingsCreated.get(day) });
    series.bookingsValue.push({ date: day, value: bookingsValue.get(day) });
    series.charges.push({ date: day, value: charges.get(day) });
    series.payments.push({ date: day, value: paymentsIn.get(day) });
    series.chargesCumulative.push({ date: day, value: runCharges });
    series.paymentsCumulative.push({ date: day, value: runPayments });
    series.balanceCumulative.push({ date: day, value: runCharges - runPayments });
    series.chairsOut.push({ date: day, value: chairsOut.get(day) });
    series.overdueCount.push({ date: day, value: overdueCount.get(day) });
  }

  return { from: days[0], to: days[days.length - 1], days, series };
}

// ---------------------------------------------------------------------------
// Ageing: outstanding balance grouped by how late it is
// ---------------------------------------------------------------------------
const AGEING_BUCKETS = [
  { key: "current", label: "Not yet due" },
  { key: "0-7", label: "1 – 7 days" },
  { key: "8-14", label: "8 – 14 days" },
  { key: "15-30", label: "15 – 30 days" },
  { key: "31+", label: "Over 30 days" },
];

function bucketForDaysOverdue(days) {
  if (days <= 0) return "current";
  if (days <= 7) return "0-7";
  if (days <= 14) return "8-14";
  if (days <= 30) return "15-30";
  return "31+";
}

function getAgeing(facts, today = toBusinessDate()) {
  const buckets = new Map(AGEING_BUCKETS.map((b) => [b.key, { ...b, customers: 0, total: 0 }]));
  const rows = [];

  for (const customer of facts.customers) {
    if (customer.archivedAt) continue;
    const entries = (facts.entriesByCustomer.get(String(customer._id)) || [])
      .slice()
      .sort((a, b) =>
        String(a.dueDate).localeCompare(String(b.dueDate)) ||
        String(a.date).localeCompare(String(b.date)),
      );
    const payments = facts.paymentsByCustomer.get(String(customer._id)) || [];
    const balance = calcBalance(entries, payments);
    if (balance <= 0) continue;

    // Walk charges in due-date order; the first one that payments cannot
    // cover is the oldest unpaid item, so its due date sets the lateness.
    let paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    let oldestUnpaidDue = null;
    let running = 0;
    for (const e of entries) {
      running += Number(e.amount) || 0;
      if (running > paid) {
        oldestUnpaidDue = e.dueDate;
        break;
      }
    }

    const daysOverdue = oldestUnpaidDue
      ? diffBusinessDays(oldestUnpaidDue, today)
      : 0;
    const key = bucketForDaysOverdue(daysOverdue);
    const bucket = buckets.get(key);
    bucket.customers += 1;
    bucket.total += balance;

    const bookingCodes = [
      ...new Set(
        entries
          .filter((e) => e.bookingId)
          .map((e) => {
            const b = facts.bookings.find(
              (x) => String(x._id) === String(e.bookingId),
            );
            return b ? b.code : null;
          })
          .filter(Boolean),
      ),
    ].slice(0, 4);

    rows.push({
      customerId: customer._id,
      code: customer.code,
      name: customer.name,
      status: customer.status,
      balance,
      daysOverdue: Math.max(0, daysOverdue),
      dueDate: oldestUnpaidDue || "",
      bookingCodes,
    });
  }

  rows.sort((a, b) => b.balance - a.balance);

  return {
    buckets: AGEING_BUCKETS.map((b) => buckets.get(b.key)),
    topDebtors: rows.slice(0, 20),
    totalOutstanding: rows.reduce((s, r) => s + r.balance, 0),
    debtorCount: rows.length,
  };
}

// ---------------------------------------------------------------------------
// Collections: money received, by month and by method
// ---------------------------------------------------------------------------
function getCollections({ from, to } = {}, facts) {
  const { from: start, to: end } = resolveRange({ from, to });
  const inRange = facts.payments.filter(
    (p) => p.paidDate >= start && p.paidDate <= end,
  );

  const byMonth = new Map();
  const byMethod = new Map();
  let total = 0;

  for (const p of inRange) {
    const amount = Number(p.amount) || 0;
    total += amount;
    const month = String(p.paidDate).slice(0, 7);
    const m = byMonth.get(month) || { month, total: 0, count: 0 };
    m.total += amount;
    m.count += 1;
    byMonth.set(month, m);

    const method = p.method || "OTHER";
    const me = byMethod.get(method) || { method, total: 0, count: 0 };
    me.total += amount;
    me.count += 1;
    byMethod.set(method, me);
  }

  const payments = inRange
    .slice()
    .sort((a, b) => String(b.paidDate).localeCompare(String(a.paidDate)))
    .slice(0, 200)
    .map((p) => {
      const customer = facts.customersById.get(String(p.customerId));
      const booking = facts.bookings.find(
        (b) => String(b._id) === String(p.bookingId),
      );
      return {
        id: p._id,
        date: p.paidDate,
        method: p.method,
        amount: Number(p.amount) || 0,
        reference: p.reference || "",
        customerName: customer ? customer.name : "",
        customerCode: customer ? customer.code : "",
        bookingCode: booking ? booking.code : "",
      };
    });

  return {
    from: start,
    to: end,
    total,
    count: inRange.length,
    byMonth: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)),
    byMethod: [...byMethod.values()].sort((a, b) => b.total - a.total),
    payments,
  };
}

// ---------------------------------------------------------------------------
// Utilisation: chair-days out against chair-days available
// ---------------------------------------------------------------------------
function getUtilisation({ from, to } = {}, facts) {
  const { days } = resolveRange({ from, to });
  const start = days[0];
  const end = days[days.length - 1];
  const totalOwned = calcTotalOwned(factMovements(facts));

  const byDay = days.map((date) => ({ date, available: totalOwned, out: 0 }));
  const dayIndex = new Map(days.map((d, i) => [d, i]));
  const byBooking = [];
  let usedChairDays = 0;

  for (const b of facts.bookings) {
    if (b.status === "CANCELLED") continue;
    const effEnd = getEffectiveEndDate(b, end);
    if (b.startDate > end || effEnd < start) continue;

    const first = b.startDate <= start ? 0 : (dayIndex.get(b.startDate) ?? 0);
    const last = effEnd >= end ? days.length - 1 : (dayIndex.get(effEnd) ?? -1);
    if (last < 0 || first > days.length - 1 || last < first) continue;

    const chairs =
      b.status === "OUT" ? Number(b.qtyOut) || 0 : Number(b.qty) || 0;
    if (chairs <= 0) continue;

    const overlapDays = last - first + 1;
    usedChairDays += chairs * overlapDays;

    for (let i = first; i <= last; i += 1) {
      byDay[i].out += chairs;
    }

    const customer = facts.customersById.get(String(b.customerId));
    byBooking.push({
      bookingCode: b.code,
      customerName: customer ? customer.name : "",
      chairs,
      days: overlapDays,
      chairDays: chairs * overlapDays,
    });
  }

  byDay.forEach((d) => {
    d.percent = d.available > 0 ? Math.round((d.out / d.available) * 1000) / 10 : 0;
  });
  byBooking.sort((a, b) => b.chairDays - a.chairDays);

  const capacityChairDays = totalOwned * days.length;

  return {
    from: start,
    to: end,
    days: days.length,
    totalOwned,
    capacityChairDays,
    usedChairDays,
    utilisationPercent:
      capacityChairDays > 0
        ? Math.round((usedChairDays / capacityChairDays) * 1000) / 10
        : 0,
    byDay,
    byBooking: byBooking.slice(0, 100),
  };
}

function factMovements(facts) {
  return facts.movements;
}

// ---------------------------------------------------------------------------
// Summary: headline figures for a range
// ---------------------------------------------------------------------------
function getSummary({ from, to } = {}, facts) {
  const { from: start, to: end, days } = resolveRange({ from, to });

  let charges = 0;
  let chargesAllTime = 0;
  for (const e of facts.entries) {
    chargesAllTime += Number(e.amount) || 0;
    if (e.date >= start && e.date <= end) charges += Number(e.amount) || 0;
  }

  let paymentsInRange = 0;
  let paymentsAllTime = 0;
  for (const p of facts.payments) {
    paymentsAllTime += Number(p.amount) || 0;
    if (p.paidDate >= start && p.paidDate <= end) {
      paymentsInRange += Number(p.amount) || 0;
    }
  }

  let bookingsCreated = 0;
  let bookingsCompleted = 0;
  let bookingsCancelled = 0;
  let createdValue = 0;
  for (const b of facts.bookings) {
    const created = businessDateOf(b.createdAt);
    if (created >= start && created <= end) {
      bookingsCreated += 1;
      createdValue += (facts.entriesByBooking.get(String(b._id)) || []).reduce(
        (s, e) => s + (Number(e.amount) || 0),
        0,
      );
      if (b.status === "RETURNED") bookingsCompleted += 1;
      if (b.status === "CANCELLED") bookingsCancelled += 1;
    }
  }

  let newCustomers = 0;
  for (const c of facts.customers) {
    const created = businessDateOf(c.createdAt);
    if (created >= start && created <= end) newCustomers += 1;
  }

  let overdueBookings = 0;
  const today = toBusinessDate();
  for (const b of facts.bookings) {
    if (b.status === "OUT" && b.endDate < today && (Number(b.qtyOut) || 0) > 0) {
      overdueBookings += 1;
    }
  }

  const outstandingBalance = chargesAllTime - paymentsAllTime;

  return {
    from: start,
    to: end,
    days: days.length,
    charges,
    payments: paymentsInRange,
    net: charges - paymentsInRange,
    bookingsCreated,
    bookingsCompleted,
    bookingsCancelled,
    newCustomers,
    avgBookingValue:
      bookingsCreated > 0 ? Math.round(createdValue / bookingsCreated) : 0,
    overdueBookings,
    outstandingBalance,
  };
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------
function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers, rows) {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return `${lines.join("\r\n")}\r\n`;
}

function buildCsv(report, params, facts) {
  const range = resolveRange(params);

  switch (report) {
    case "debtors": {
      const ageing = getAgeing(facts);
      const rows = ageing.topDebtors.map((d) => [
        d.code,
        d.name,
        d.status,
        d.balance,
        d.daysOverdue,
        d.dueDate,
        (d.bookingCodes || []).join(" "),
      ]);
      return toCsv(
        ["Code", "Customer", "Status", "Balance", "Days overdue", "Oldest due", "Bookings"],
        rows,
      );
    }
    case "ageing": {
      const ageing = getAgeing(facts);
      return toCsv(
        ["Bucket", "Customers", "Balance"],
        ageing.buckets.map((b) => [b.label, b.customers, b.total]),
      );
    }
    case "collections": {
      const c = getCollections(params, facts);
      return toCsv(
        ["Date", "Method", "Amount", "Reference", "Customer", "Code", "Booking"],
        c.payments.map((p) => [
          p.date,
          p.method,
          p.amount,
          p.reference,
          p.customerName,
          p.customerCode,
          p.bookingCode,
        ]),
      );
    }
    case "utilisation": {
      const u = getUtilisation(params, facts);
      return toCsv(
        ["Date", "Owned", "Chairs out", "Percent"],
        u.byDay.map((d) => [d.date, d.available, d.out, d.percent]),
      );
    }
    case "payments": {
      const rows = facts.payments
        .filter((p) => p.paidDate >= range.from && p.paidDate <= range.to)
        .sort((a, b) => String(b.paidDate).localeCompare(String(a.paidDate)))
        .map((p) => {
          const c = facts.customersById.get(String(p.customerId));
          return [p.paidDate, p.method, p.amount, p.reference, c ? c.name : ""];
        });
      return toCsv(["Date", "Method", "Amount", "Reference", "Customer"], rows);
    }
    case "bookings": {
      const rows = facts.bookings
        .filter((b) => {
          const created = businessDateOf(b.createdAt);
          return created >= range.from && created <= range.to;
        })
        .map((b) => {
          const c = facts.customersById.get(String(b.customerId));
          const value = (facts.entriesByBooking.get(String(b._id)) || []).reduce(
            (s, e) => s + (Number(e.amount) || 0),
            0,
          );
          return [
            b.code,
            c ? c.name : "",
            b.status,
            b.startDate,
            b.endDate,
            b.qty,
            b.qtyOut,
            value,
          ];
        });
      return toCsv(
        ["Booking", "Customer", "Status", "Start", "End", "Chairs", "Out", "Charged"],
        rows,
      );
    }
    case "summary":
    default: {
      const s = getSummary(params, facts);
      return toCsv(
        ["Metric", "Value"],
        [
          ["From", s.from],
          ["To", s.to],
          ["Charges", s.charges],
          ["Payments", s.payments],
          ["Net", s.net],
          ["Bookings created", s.bookingsCreated],
          ["Bookings completed", s.bookingsCompleted],
          ["Bookings cancelled", s.bookingsCancelled],
          ["New customers", s.newCustomers],
          ["Average booking value", s.avgBookingValue],
          ["Overdue bookings", s.overdueBookings],
          ["Outstanding balance (all time)", s.outstandingBalance],
        ],
      );
    }
  }
}

const CSV_REPORTS = [
  "debtors",
  "ageing",
  "collections",
  "utilisation",
  "payments",
  "bookings",
  "summary",
];

module.exports = {
  CSV_REPORTS,
  resolveRange,
  loadFacts,
  getTrends,
  getAgeing,
  getCollections,
  getUtilisation,
  getSummary,
  buildCsv,
};
