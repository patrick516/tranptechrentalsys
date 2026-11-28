// Detailed period report as a real PDF (pdfkit): money made, bookings and
// chairs per booking, booking frequency, every customer, ageing, collections,
// utilisation and an "important information" summary.
//
//   const buffer = await generateReportPdfBuffer(await loadReportBundle({from,to}))
const PDFDocument = require("pdfkit");
const reportStats = require("../reportStats");
const Settings = require("../../models/Settings");
const PromiseModel = require("../../models/Promise");
const Message = require("../../models/Message");
const { calcBalance } = require("../ledger.calc");
const { getEffectiveEndDate } = require("../stock");
const { toBusinessDate, diffBusinessDays } = require("../../utils/dates");

const NAVY = "#0F172A";
const BLUE = "#005098";
const SLATE = "#475569";
const MUTED = "#94A3B8";
const LINE = "#E2E8F0";
const ZEBRA = "#F8FAFC";
const HEADER_BG = "#E2E8F0";

const FONT = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function mk(value) {
  return `MK ${Number(value || 0).toLocaleString("en-US")}`;
}

function num(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function avg(values) {
  if (!values.length) return 0;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Data bundle: everything the PDF needs, from reportStats plus a few extras
// ---------------------------------------------------------------------------
async function loadReportBundle({ from, to } = {}) {
  const range = reportStats.resolveRange({ from, to });
  const facts = await reportStats.loadFacts();
  const today = toBusinessDate();

  const [settings, pendingPromises, failedMessages] = await Promise.all([
    Settings.findOne({ key: "default" }).lean(),
    PromiseModel.find({ status: "PENDING" }).lean(),
    Message.countDocuments({ status: "FAILED" }),
  ]);

  const summary = reportStats.getSummary(range, facts);
  const ageing = reportStats.getAgeing(facts, today);
  const collections = reportStats.getCollections(range, facts);
  const utilisation = reportStats.getUtilisation(range, facts);
  const trends = reportStats.getTrends(range, facts);

  const { from: start, to: end, days } = range;

  const paymentsByBooking = new Map();
  for (const p of facts.payments) {
    if (!p.bookingId) continue;
    const key = String(p.bookingId);
    paymentsByBooking.set(
      key,
      (paymentsByBooking.get(key) || 0) + (Number(p.amount) || 0),
    );
  }

  // Bookings created in the period, or overlapping it (so chairs out count).
  const bookingsInPeriod = facts.bookings
    .filter((b) => {
      const created = toBusinessDate(b.createdAt);
      const overlaps =
        b.startDate <= end && getEffectiveEndDate(b, end) >= start;
      return (created >= start && created <= end) || overlaps;
    })
    .sort(
      (a, b) =>
        String(a.startDate).localeCompare(String(b.startDate)) ||
        String(a.code).localeCompare(String(b.code)),
    );

  let totalChairsHired = 0;
  const bookingRows = bookingsInPeriod.map((b) => {
    const customer = facts.customersById.get(String(b.customerId));
    const chairs =
      b.status === "OUT" ? Number(b.qtyOut) || 0 : Number(b.qty) || 0;
    const durationDays = Math.max(
      1,
      diffBusinessDays(b.startDate, b.endDate) + 1,
    );
    const charged = (facts.entriesByBooking.get(String(b._id)) || []).reduce(
      (s, e) => s + (Number(e.amount) || 0),
      0,
    );
    const paid = paymentsByBooking.get(String(b._id)) || 0;
    totalChairsHired += chairs;
    return {
      cid: String(b.customerId),
      code: b.code,
      customer: customer ? customer.name : "-",
      start: b.startDate,
      end: b.endDate,
      status: b.status,
      chairs,
      days: durationDays,
      charged,
      paid,
      balance: charged - paid,
      createdAt: toBusinessDate(b.createdAt),
    };
  });

  // Every active customer with period activity and lifetime balance.
  const customerRows = facts.customers
    .filter((c) => !c.archivedAt)
    .map((c) => {
      const cid = String(c._id);
      const own = bookingRows.filter((r) => r.cid === cid);
      let chargedPeriod = 0;
      for (const e of facts.entriesByCustomer.get(cid) || []) {
        if (e.date >= start && e.date <= end) chargedPeriod += Number(e.amount) || 0;
      }
      let paidPeriod = 0;
      for (const p of facts.paymentsByCustomer.get(cid) || []) {
        if (p.paidDate >= start && p.paidDate <= end) paidPeriod += Number(p.amount) || 0;
      }
      const balance = calcBalance(
        facts.entriesByCustomer.get(cid) || [],
        facts.paymentsByCustomer.get(cid) || [],
      );
      const primary =
        (c.contacts || []).find((x) => x.isPrimary) || (c.contacts || [])[0];
      return {
        code: c.code,
        name: c.name,
        area: c.area || "-",
        phone: primary ? primary.phone : "-",
        type: c.type || "-",
        status: c.status,
        bookings: own.length,
        chairs: own.reduce((s, r) => s + r.chairs, 0),
        charged: chargedPeriod,
        paid: paidPeriod,
        balance,
      };
    })
    .sort(
      (a, b) =>
        b.balance - a.balance || String(a.code).localeCompare(String(b.code)),
    );

  // Weekly money and booking frequency.
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    const slice = days.slice(i, i + 7);
    const wStart = slice[0];
    const wEnd = slice[slice.length - 1];
    const created = facts.bookings.filter((b) => {
      const d = toBusinessDate(b.createdAt);
      return d >= wStart && d <= wEnd;
    });
    const charges = facts.entries
      .filter((e) => e.date >= wStart && e.date <= wEnd)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const payments = facts.payments
      .filter((p) => p.paidDate >= wStart && p.paidDate <= wEnd)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    weeks.push({
      label: wStart === wEnd ? wStart : `${wStart} to ${wEnd}`,
      bookings: created.length,
      chairs: created.reduce((s, b) => s + (Number(b.qty) || 0), 0),
      charges,
      payments,
      net: charges - payments,
    });
  }

  // Bookings by weekday (booking frequency patterns).
  const weekdayStats = WEEKDAYS.map((label) => ({
    label,
    bookings: 0,
    chairs: 0,
    charged: 0,
  }));
  for (const row of bookingRows) {
    const dow = new Date(`${row.createdAt}T00:00:00Z`).getUTCDay();
    weekdayStats[dow].bookings += 1;
    weekdayStats[dow].chairs += row.chairs;
    weekdayStats[dow].charged += row.charged;
  }
  const weekdaysUsed = weekdayStats.filter((w) => w.bookings > 0);

  // Highlights / important information.
  const overduePromises = pendingPromises.filter((p) => p.promisedDate < today);
  const lateFees = facts.entries
    .filter((e) => e.type === "LATE_FEE" && e.date >= start && e.date <= end)
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const chairsLost = facts.movements
    .filter((m) => m.type === "LOST" && m.date >= start && m.date <= end)
    .reduce((s, m) => s + (Number(m.qty) || 0), 0);
  const chairsDamaged = facts.movements
    .filter((m) => m.type === "DAMAGED" && m.date >= start && m.date <= end)
    .reduce((s, m) => s + (Number(m.qty) || 0), 0);
  const chairsRepaired = facts.movements
    .filter((m) => m.type === "REPAIRED" && m.date >= start && m.date <= end)
    .reduce((s, m) => s + (Number(m.qty) || 0), 0);
  const busiest = trends.series.bookingsCreated
    .slice()
    .sort((a, b) => b.value - a.value)[0];
  const repeatCustomers = customerRows.filter((r) => r.bookings >= 2).length;
  const activeCustomers = customerRows.filter((r) => r.bookings > 0).length;

  const busiestDays = utilisation.byDay
    .slice()
    .sort((a, b) => b.out - a.out)
    .slice(0, 10);

  return {
    range,
    businessName: (settings && settings.businessName) || "TranpTech Chair Rentals",
    smsDailyLimit: (settings && Number(settings.smsDailyCap)) || 100,
    generatedAt: `${today} ${new Date().toTimeString().slice(0, 5)}`,
    summary,
    ageing,
    collections,
    utilisation,
    trends,
    bookingRows,
    customerRows,
    weeks,
    weekdaysUsed,
    busiestDays,
    totals: {
      chairsHired: totalChairsHired,
      avgChairs: avg(bookingRows.map((r) => r.chairs)),
      avgDuration: avg(bookingRows.map((r) => r.days)),
      lateFees,
      chairsLost,
      chairsDamaged,
      chairsRepaired,
      overduePromises: overduePromises.length,
      failedMessages,
      repeatCustomers,
      activeCustomers,
      newCustomers: summary.newCustomers,
      busiestDay: busiest && busiest.value > 0 ? busiest : null,
      topDebtor: ageing.topDebtors[0] || null,
    },
  };
}

// ---------------------------------------------------------------------------
// PDF rendering
// ---------------------------------------------------------------------------
function generateReportPdfBuffer(bundle) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 48, bottom: 48, left: 48, right: 48 },
      info: {
        Title: `Detailed report ${bundle.range.from} to ${bundle.range.to}`,
        Author: bundle.businessName,
        Subject: "Chair rental period report",
        Creator: "TranpTech Chair Rentals",
      },
      bufferPages: true,
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    render(doc, bundle);
    stampPages(doc, bundle);
    doc.end();
  });
}

// Headers/footers are stamped after the body is laid out (bufferPages +
// switchToPage). A pageAdded handler must NOT draw text: addPage() flushes
// pages and emits pageAdded in the middle of an active line-wrap, and
// re-entering doc.text there corrupts the wrapper into infinite page breaks.
function stampPages(doc, b) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i + 1);
    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageNo = i + 1;
    const footerY = doc.page.height - 32;
    doc.save();
    doc.font(FONT).fontSize(7.5).fillColor(MUTED);
    if (pageNo > 1) {
      doc.text(
        `${b.businessName} - detailed report  ${b.range.from} to ${b.range.to}`,
        left,
        26,
        { width, align: "left", lineBreak: false },
      );
      doc.text(`Page ${pageNo} of ${range.count}`, left, 26, {
        width,
        align: "right",
        lineBreak: false,
      });
    }
    doc.text(
      `Generated ${b.generatedAt} - whole Kwacha - Africa/Blantyre`,
      left,
      footerY,
      { width, align: "left", lineBreak: false },
    );
    doc.text(`Page ${pageNo} of ${range.count}`, left, footerY, {
      width,
      align: "right",
      lineBreak: false,
    });
    doc.restore();
  }
}

function render(doc, b) {
  const left = () => doc.page.margins.left;
  const right = () => doc.page.width - doc.page.margins.right;
  const width = () => right() - left();
  const bottom = () => doc.page.height - doc.page.margins.bottom;

  function ensure(space) {
    if (doc.y + space > bottom()) doc.addPage();
  }

  function section(title) {
    ensure(46);
    doc.y += 10;
    doc.font(FONT_BOLD).fontSize(12).fillColor(BLUE);
    doc.text(title, left(), doc.y, { width: width() });
    doc.y += 4;
    doc
      .moveTo(left(), doc.y)
      .lineTo(right(), doc.y)
      .lineWidth(1)
      .strokeColor(LINE)
      .stroke();
    doc.y += 8;
    doc.font(FONT).fontSize(9).fillColor(NAVY);
  }

  function paragraph(text, opts = {}) {
    const size = opts.size || 9;
    doc.font(opts.bold ? FONT_BOLD : FONT).fontSize(size).fillColor(opts.color || SLATE);
    const height = doc.heightOfString(text, { width: width() });
    ensure(height + 4);
    doc.text(text, left(), doc.y, { width: width(), align: opts.align || "left" });
    doc.y += opts.gap === undefined ? 4 : opts.gap;
    doc.font(FONT).fontSize(9).fillColor(NAVY);
  }

  function bullets(lines) {
    for (const line of lines) paragraph(`- ${line}`, { size: 8.5, gap: 3 });
  }

  // label / value rows, full width, alternating shade
  function keyValues(pairs) {
    const rowH = 16;
    pairs.forEach(([label, value], i) => {
      ensure(rowH + 2);
      const y = doc.y;
      if (i % 2 === 1) {
        doc.save().rect(left(), y, width(), rowH).fill(ZEBRA).restore();
      }
      doc.font(FONT).fontSize(9).fillColor(SLATE);
      doc.text(String(label), left() + 6, y + 3.5, {
        width: width() * 0.6,
        lineBreak: false,
      });
      doc.font(FONT_BOLD).fontSize(9).fillColor(NAVY);
      doc.text(String(value), left(), y + 3.5, {
        width: width() - 6,
        align: "right",
        lineBreak: false,
      });
      doc.y = y + rowH;
    });
    doc.y += 6;
    doc.font(FONT).fontSize(9).fillColor(NAVY);
  }

  function table(columns, rows, opts = {}) {
    const fontSize = opts.fontSize || 8;
    const rowH = opts.rowH || 15;
    const headerH = 17;
    const totalW = columns.reduce((s, c) => s + c.width, 0);

    const drawHeader = (y) => {
      doc.save().rect(left(), y, totalW, headerH).fill(HEADER_BG).restore();
      let x = left();
      doc.font(FONT_BOLD).fontSize(fontSize).fillColor("#334155");
      for (const c of columns) {
        doc.text(c.header, x + 4, y + 4.5, {
          width: c.width - 8,
          align: c.align || "left",
          lineBreak: false,
          ellipsis: true,
        });
        x += c.width;
      }
      doc.fillColor(NAVY);
    };

    ensure(headerH + rowH + 4);
    let y = doc.y;
    drawHeader(y);
    y += headerH;

    rows.forEach((row, i) => {
      if (y + rowH > bottom()) {
        doc.addPage();
        y = doc.y;
        drawHeader(y);
        y += headerH;
      }
      const isTotals = row.__totals === true;
      if (isTotals) {
        doc.save().rect(left(), y, totalW, rowH).fill("#EFF6FF").restore();
        doc
          .moveTo(left(), y)
          .lineTo(left() + totalW, y)
          .lineWidth(0.75)
          .strokeColor("#93C5FD")
          .stroke();
      } else if (i % 2 === 1) {
        doc.save().rect(left(), y, totalW, rowH).fill(ZEBRA).restore();
      }
      let x = left();
      doc.font(isTotals ? FONT_BOLD : FONT).fontSize(fontSize).fillColor(NAVY);
      for (const c of columns) {
        const raw = row[c.key];
        const value = raw === undefined || raw === null ? "" : String(raw);
        doc.text(value, x + 4, y + 4, {
          width: c.width - 8,
          align: c.align || "left",
          lineBreak: false,
          ellipsis: true,
        });
        x += c.width;
      }
      y += rowH;
    });

    doc.y = y + 6;
    doc.font(FONT).fontSize(9).fillColor(NAVY);
  }

  // ----- cover block -------------------------------------------------------
  doc.font(FONT_BOLD).fontSize(20).fillColor(NAVY);
  doc.text(b.businessName, left(), doc.y, { width: width() });
  doc.y += 6;
  doc.font(FONT_BOLD).fontSize(14).fillColor(BLUE);
  doc.text("Detailed period report", left(), doc.y, { width: width() });
  doc.y += 6;
  doc.font(FONT).fontSize(10).fillColor(SLATE);
  doc.text(
    `Period: ${b.range.from} to ${b.range.to}  (${b.range.days.length} business days)`,
    left(),
    doc.y,
    { width: width() },
  );
  doc.y += 4;
  doc.text(`Generated: ${b.generatedAt}`, left(), doc.y, { width: width() });
  doc.y += 4;
  doc.text(
    "All amounts are whole Kwacha (MK). Dates are business dates in Africa/Blantyre.",
    left(),
    doc.y,
    { width: width() },
  );
  doc.y += 10;
  doc
    .moveTo(left(), doc.y)
    .lineTo(right(), doc.y)
    .lineWidth(1.5)
    .strokeColor(BLUE)
    .stroke();
  doc.y += 6;

  const s = b.summary;
  const t = b.totals;

  // ----- 1. Money ----------------------------------------------------------
  section("1. Money in the period");
  keyValues([
    ["Charges raised (hires, fees, adjustments)", mk(s.charges)],
    ["Payments received", mk(s.payments)],
    ["Net cash for the period (received - charged)", mk(s.payments - s.charges)],
    ["Late fees charged in the period", mk(t.lateFees)],
    ["Outstanding balance (all customers, all time)", mk(s.outstandingBalance)],
    ["Average booking value", mk(s.avgBookingValue)],
    ["New customers acquired", num(s.newCustomers)],
    ["Bookings created / completed / cancelled", `${num(s.bookingsCreated)} / ${num(s.bookingsCompleted)} / ${num(s.bookingsCancelled)}`],
  ]);

  if (b.collections.byMethod.length) {
    paragraph("Collections by payment method", { bold: true, size: 9, color: NAVY });
    table(
      [
        { key: "method", header: "Method", width: 140 },
        { key: "count", header: "Payments", width: 90, align: "right" },
        { key: "total", header: "Received (MK)", width: 120, align: "right" },
        { key: "share", header: "Share", width: 90, align: "right" },
      ],
      b.collections.byMethod.map((m) => ({
        method: m.method,
        count: num(m.count),
        total: num(m.total),
        share: `${b.collections.total > 0 ? Math.round((m.total / b.collections.total) * 100) : 0}%`,
      })),
    );
  }

  if (b.weeks.length) {
    paragraph("Week by week", { bold: true, size: 9, color: NAVY });
    table(
      [
        { key: "label", header: "Week", width: 130 },
        { key: "bookings", header: "Bookings", width: 65, align: "right" },
        { key: "chairs", header: "Chairs", width: 60, align: "right" },
        { key: "charges", header: "Charged", width: 82, align: "right" },
        { key: "payments", header: "Received", width: 82, align: "right" },
        { key: "net", header: "Net", width: 75, align: "right" },
      ],
      b.weeks.map((w) => ({
        label: w.label,
        bookings: num(w.bookings),
        chairs: num(w.chairs),
        charges: num(w.charges),
        payments: num(w.payments),
        net: num(w.net),
      })),
    );
  }

  // ----- 2. Bookings and chairs -------------------------------------------
  section("2. Bookings, chairs and frequency");
  keyValues([
    ["Bookings touching the period", num(b.bookingRows.length)],
    ["Chairs hired (sum of chairs per booking)", num(t.chairsHired)],
    ["Average chairs per booking", String(t.avgChairs)],
    ["Average booking length (days)", String(t.avgDuration)],
    ["Chair-days used / fleet capacity", `${num(b.utilisation.usedChairDays)} / ${num(b.utilisation.capacityChairDays)}`],
    ["Fleet utilisation", `${b.utilisation.utilisationPercent}%`],
    ["Busiest day", t.busiestDay ? `${t.busiestDay.date} (${t.busiestDay.value} booking${t.busiestDay.value === 1 ? "" : "s"})` : "-"],
    ["Customers with bookings / repeat customers (2+)", `${num(t.activeCustomers)} / ${num(t.repeatCustomers)}`],
  ]);

  if (b.weekdaysUsed.length) {
    paragraph("Booking frequency by day of week", { bold: true, size: 9, color: NAVY });
    table(
      [
        { key: "label", header: "Day", width: 120 },
        { key: "bookings", header: "Bookings", width: 90, align: "right" },
        { key: "chairs", header: "Chairs hired", width: 100, align: "right" },
        { key: "charged", header: "Charged (MK)", width: 120, align: "right" },
      ],
      b.weekdaysUsed.map((w) => ({
        label: w.label,
        bookings: num(w.bookings),
        chairs: num(w.chairs),
        charged: num(w.charged),
      })),
    );
  }

  // ----- 3. Booking detail -------------------------------------------------
  section("3. Booking detail (chairs and money per booking)");
  if (b.bookingRows.length === 0) {
    paragraph("No bookings in this period.");
  } else {
    const bookingCols = [
      { key: "code", header: "Booking", width: 54 },
      { key: "customer", header: "Customer", width: 92 },
      { key: "start", header: "Start", width: 54 },
      { key: "end", header: "End", width: 54 },
      { key: "chairs", header: "Chairs", width: 38, align: "right" },
      { key: "days", header: "Days", width: 34, align: "right" },
      { key: "charged", header: "Charged", width: 58, align: "right" },
      { key: "paid", header: "Paid", width: 54, align: "right" },
      { key: "balance", header: "Balance", width: 55, align: "right" },
    ];
    const rows = b.bookingRows.map((r) => ({
      code: r.code,
      customer: r.customer,
      start: r.start,
      end: r.end,
      chairs: num(r.chairs),
      days: num(r.days),
      charged: num(r.charged),
      paid: num(r.paid),
      balance: num(r.balance),
    }));
    rows.push({
      __totals: true,
      code: "TOTAL",
      customer: `${b.bookingRows.length} bookings`,
      start: "",
      end: "",
      chairs: num(t.chairsHired),
      days: "",
      charged: num(b.bookingRows.reduce((sum, r) => sum + r.charged, 0)),
      paid: num(b.bookingRows.reduce((sum, r) => sum + r.paid, 0)),
      balance: num(b.bookingRows.reduce((sum, r) => sum + r.balance, 0)),
    });
    table(bookingCols, rows, { fontSize: 7.5, rowH: 14 });
    paragraph(
      "Chairs = chairs on the booking (or still out). Days = charged days from start to end. Balance = charged minus payments recorded against the booking.",
      { size: 7.5, color: MUTED },
    );
  }

  // ----- 4. Customer details ----------------------------------------------
  section("4. Customer details");
  if (b.customerRows.length === 0) {
    paragraph("No customers yet.");
  } else {
    const customerCols = [
      { key: "code", header: "Code", width: 42 },
      { key: "name", header: "Customer", width: 84 },
      { key: "area", header: "Area", width: 54 },
      { key: "phone", header: "Phone", width: 72 },
      { key: "type", header: "Type", width: 50 },
      { key: "bookings", header: "Bkg", width: 30, align: "right" },
      { key: "chairs", header: "Chairs", width: 36, align: "right" },
      { key: "charged", header: "Charged", width: 48, align: "right" },
      { key: "paid", header: "Paid", width: 45, align: "right" },
      { key: "balance", header: "Balance", width: 48, align: "right" },
    ];
    const rows = b.customerRows.map((c) => ({
      code: c.code,
      name: c.name,
      area: c.area,
      phone: c.phone,
      type: c.type,
      bookings: num(c.bookings),
      chairs: num(c.chairs),
      charged: num(c.charged),
      paid: num(c.paid),
      balance: num(c.balance),
    }));
    rows.push({
      __totals: true,
      code: "",
      name: `${b.customerRows.length} customers`,
      area: "",
      phone: "",
      type: "",
      bookings: num(b.customerRows.reduce((s2, c) => s2 + c.bookings, 0)),
      chairs: num(b.customerRows.reduce((s2, c) => s2 + c.chairs, 0)),
      charged: num(b.customerRows.reduce((s2, c) => s2 + c.charged, 0)),
      paid: num(b.customerRows.reduce((s2, c) => s2 + c.paid, 0)),
      balance: num(b.customerRows.reduce((s2, c) => s2 + c.balance, 0)),
    });
    table(customerCols, rows, { fontSize: 7, rowH: 13 });
    paragraph(
      "Charged / Paid are for this period only. Balance is the customer's all-time outstanding amount.",
      { size: 7.5, color: MUTED },
    );
  }

  // ----- 5. Ageing and debtors --------------------------------------------
  section("5. Ageing and debtors");
  keyValues([
    ["Customers owing money", num(b.ageing.debtorCount)],
    ["Total outstanding", mk(b.ageing.totalOutstanding)],
  ]);
  table(
    [
      { key: "label", header: "Ageing bucket", width: 170 },
      { key: "customers", header: "Customers", width: 110, align: "right" },
      { key: "total", header: "Amount (MK)", width: 140, align: "right" },
    ],
    b.ageing.buckets.map((bucket) => ({
      label: bucket.label,
      customers: num(bucket.customers),
      total: num(bucket.total),
    })),
  );
  if (b.ageing.topDebtors.length) {
    paragraph("Top debtors", { bold: true, size: 9, color: NAVY });
    table(
      [
        { key: "code", header: "Code", width: 44 },
        { key: "name", header: "Customer", width: 120 },
        { key: "status", header: "Status", width: 60 },
        { key: "balance", header: "Balance", width: 70, align: "right" },
        { key: "days", header: "Days late", width: 55, align: "right" },
        { key: "due", header: "Oldest due", width: 70 },
        { key: "bookings", header: "Bookings", width: 80 },
      ],
      b.ageing.topDebtors.slice(0, 15).map((d) => ({
        code: d.code,
        name: d.name,
        status: d.status,
        balance: num(d.balance),
        days: d.daysOverdue > 0 ? num(d.daysOverdue) : "-",
        due: d.dueDate || "-",
        bookings: (d.bookingCodes || []).join(", ") || "-",
      })),
      { fontSize: 7.5 },
    );
  }

  // ----- 6. Collections detail --------------------------------------------
  section("6. Payments received (detail)");
  keyValues([
    ["Payments in the period", num(b.collections.count)],
    ["Total received", mk(b.collections.total)],
  ]);
  if (b.collections.payments.length === 0) {
    paragraph("No payments recorded in this period.");
  } else {
    table(
      [
        { key: "date", header: "Date", width: 58 },
        { key: "customer", header: "Customer", width: 130 },
        { key: "method", header: "Method", width: 70 },
        { key: "booking", header: "Booking", width: 60 },
        { key: "amount", header: "Amount (MK)", width: 75, align: "right" },
        { key: "reference", header: "Reference", width: 100 },
      ],
      b.collections.payments.map((p) => ({
        date: p.date,
        customer: p.customerName || p.customerCode || "-",
        method: p.method,
        booking: p.bookingCode || "-",
        amount: num(p.amount),
        reference: p.reference || "-",
      })),
      { fontSize: 7.5 },
    );
  }

  // ----- 7. Utilisation ----------------------------------------------------
  section("7. Fleet utilisation");
  keyValues([
    ["Chairs owned (fleet size)", num(b.utilisation.totalOwned)],
    ["Chair-days available / used", `${num(b.utilisation.capacityChairDays)} / ${num(b.utilisation.usedChairDays)}`],
    ["Utilisation", `${b.utilisation.utilisationPercent}%`],
    ["Chairs out on the busiest day", b.busiestDays[0] ? `${b.busiestDays[0].date}: ${num(b.busiestDays[0].out)} chairs (${b.busiestDays[0].percent}%)` : "-"],
  ]);
  if (b.busiestDays.length) {
    paragraph("Busiest days (chairs out)", { bold: true, size: 9, color: NAVY });
    table(
      [
        { key: "date", header: "Date", width: 120 },
        { key: "out", header: "Chairs out", width: 110, align: "right" },
        { key: "percent", header: "Of fleet", width: 100, align: "right" },
      ],
      b.busiestDays.map((d) => ({
        date: d.date,
        out: num(d.out),
        percent: `${d.percent}%`,
      })),
    );
  }

  // ----- 8. Important information -----------------------------------------
  section("8. Important information");
  bullets([
    `${num(s.overdueBookings)} booking(s) are overdue right now (chairs still out past the end date).`,
    `${num(t.overduePromises)} promise(s) are pending past their promised date.`,
    `${num(t.failedMessages)} message(s) are in FAILED status and need a re-send from the Messages page.`,
    `${num(t.chairsLost)} chair(s) marked LOST, ${num(t.chairsDamaged)} DAMAGED and ${num(t.chairsRepaired)} REPAIRED in this period.`,
    `${num(s.newCustomers)} new customer(s) joined in this period; ${num(t.repeatCustomers)} customer(s) booked more than once.`,
    t.topDebtor
      ? `Largest debtor: ${t.topDebtor.name} (${t.topDebtor.code}) at ${mk(t.topDebtor.balance)}, ${num(t.topDebtor.daysOverdue)} day(s) late.`
      : "No outstanding debtor balances.",
    t.busiestDay
      ? `Busiest day was ${t.busiestDay.date} with ${num(t.busiestDay.value)} booking(s).`
      : "No bookings were created in this period.",
    `${num(b.ageing.debtorCount)} customer(s) owe money, ${mk(b.ageing.totalOutstanding)} in total across all ageing buckets.`,
    `Fleet utilisation for the period is ${b.utilisation.utilisationPercent}% (${num(b.utilisation.usedChairDays)} of ${num(b.utilisation.capacityChairDays)} chair-days used).`,
    `Automatic SMS is capped at ${num(b.smsDailyLimit)} message(s) per day and is held during quiet hours (19:00 to 07:00); ${num(t.failedMessages)} message(s) failed and can be re-sent from the Messages page.`,
  ]);

  doc.y += 8;
  paragraph(
    "This report was generated automatically from the TranpTech Chair Rentals system. Figures are based on confirmed payments and non-voided ledger entries.",
    { size: 7.5, color: MUTED },
  );
}

module.exports = { loadReportBundle, generateReportPdfBuffer };
