// Dashboard KPIs, debtors report, and manual daily ledger job trigger (/api/v1/reports)
const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const { validate } = require("../middleware/validate");
const Booking = require("../models/Booking");
const Customer = require("../models/Customer");
const LedgerEntry = require("../models/LedgerEntry");
const Payment = require("../models/Payment");
const StockMovement = require("../models/StockMovement");
const PromiseModel = require("../models/Promise");
const { toBusinessDate } = require("../utils/dates");
const { calcAvailabilityRange } = require("../services/stock");
const { calcBalance } = require("../services/ledger.calc");
const { runDailyLedgerJob } = require("../jobs/dailyLedgerJob");
const reportStats = require("../services/reportStats");

const router = express.Router();

const runJobSchema = z.object({
  businessDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

router.use(requireAuth);

router.get(
  "/dashboard",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  async (_req, res, next) => {
    try {
      const today = toBusinessDate();

      const [
        movements,
        activeBookings,
        allLedger,
        allPayments,
        pendingPromises,
        watchlistCount,
        blockedCount,
      ] = await Promise.all([
        StockMovement.find({}).lean(),
        Booking.find({ status: { $in: ["RESERVED", "OUT"] } }).lean(),
        LedgerEntry.find({ voidedAt: null }).lean(),
        Payment.find({ status: "CONFIRMED" }).lean(),
        PromiseModel.find({
          status: "PENDING",
          promisedDate: { $lte: today },
        }).lean(),
        Customer.countDocuments({ archivedAt: null, status: "WATCHLIST" }),
        Customer.countDocuments({ archivedAt: null, status: "BLOCKED" }),
      ]);

      const availabilityToday = calcAvailabilityRange({
        movements,
        bookings: activeBookings,
        fromDate: today,
        toDate: today,
        today,
      });

      const outBookings = activeBookings.filter((b) => b.status === "OUT");
      const overdueBookings = outBookings.filter((b) => b.endDate < today);
      const chairsOut = outBookings.reduce(
        (sum, b) => sum + (Number(b.qtyOut) || 0),
        0,
      );
      const reservedCount = activeBookings.filter(
        (b) => b.status === "RESERVED",
      ).length;

      const totalCharges = allLedger.reduce(
        (s, e) => s + (Number(e.amount) || 0),
        0,
      );
      const totalPayments = allPayments.reduce(
        (s, p) => s + (Number(p.amount) || 0),
        0,
      );
      const netReceivable = totalCharges - totalPayments;

      const paymentsToday = allPayments
        .filter((p) => p.paidDate === today)
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);

      return res.status(200).json({
        data: {
          businessDate: today,
          totalOwnedChairs: availabilityToday.totalOwned,
          availableToday: availabilityToday.minAvailable,
          chairsOut,
          reservedBookingsCount: reservedCount,
          activeOutCount: outBookings.length,
          overdueBookingsCount: overdueBookings.length,
          netReceivable,
          paymentsToday,
          duePromisesCount: pendingPromises.length,
          watchlistCustomersCount: watchlistCount,
          blockedCustomersCount: blockedCount,
        },
      });
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  "/debtors",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  async (_req, res, next) => {
    try {
      const [customers, entries, payments] = await Promise.all([
        Customer.find({ archivedAt: null }).lean(),
        LedgerEntry.find({}).lean(),
        Payment.find({}).lean(),
      ]);

      const entriesByCustomer = new Map();
      for (const e of entries) {
        const k = String(e.customerId);
        if (!entriesByCustomer.has(k)) entriesByCustomer.set(k, []);
        entriesByCustomer.get(k).push(e);
      }

      const paymentsByCustomer = new Map();
      for (const p of payments) {
        const k = String(p.customerId);
        if (!paymentsByCustomer.has(k)) paymentsByCustomer.set(k, []);
        paymentsByCustomer.get(k).push(p);
      }

      const debtors = customers
        .map((c) => {
          const k = String(c._id);
          const balance = calcBalance(
            entriesByCustomer.get(k) || [],
            paymentsByCustomer.get(k) || [],
          );
          const primaryContact =
            c.contacts?.find((ct) => ct.isPrimary) || c.contacts?.[0] || null;
          return {
            customerId: c._id,
            code: c.code,
            name: c.name,
            status: c.status,
            primaryPhone: primaryContact?.phone || "",
            balance,
          };
        })
        .filter((row) => row.balance > 0)
        .sort((a, b) => b.balance - a.balance);

      return res.status(200).json({ data: debtors });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  "/run-daily-job",
  requireRoles("ADMIN"),
  validate({ body: runJobSchema }),
  async (req, res, next) => {
    try {
      const result = await runDailyLedgerJob(req.body.businessDate || null);
      return res.status(200).json({ data: result });
    } catch (err) {
      return next(err);
    }
  },
);

// --- Range based reports -----------------------------------------------------
const rangeQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  period: z.enum(["week", "month", "custom"]).optional(),
});

function rangeFromQuery(query) {
  if (query.period === "week") {
    const end = toBusinessDate();
    const d = new Date(`${end}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 6);
    return { from: query.from || d.toISOString().slice(0, 10), to: query.to || end };
  }
  if (query.period === "month") {
    const end = toBusinessDate();
    return { from: query.from || `${end.slice(0, 7)}-01`, to: query.to || end };
  }
  return { from: query.from, to: query.to };
}

router.get(
  "/trends",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  validate({ query: rangeQuerySchema }),
  async (req, res, next) => {
    try {
      const facts = await reportStats.loadFacts();
      const data = reportStats.getTrends(rangeFromQuery(req.query), facts);
      return res.status(200).json({ data });
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  "/summary",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  validate({ query: rangeQuerySchema }),
  async (req, res, next) => {
    try {
      const facts = await reportStats.loadFacts();
      const data = reportStats.getSummary(rangeFromQuery(req.query), facts);
      return res.status(200).json({ data });
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  "/ageing",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  async (req, res, next) => {
    try {
      const facts = await reportStats.loadFacts();
      const data = reportStats.getAgeing(facts, toBusinessDate());
      return res.status(200).json({ data });
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  "/collections",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  validate({ query: rangeQuerySchema }),
  async (req, res, next) => {
    try {
      const facts = await reportStats.loadFacts();
      const data = reportStats.getCollections(rangeFromQuery(req.query), facts);
      return res.status(200).json({ data });
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  "/utilisation",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  validate({ query: rangeQuerySchema }),
  async (req, res, next) => {
    try {
      const facts = await reportStats.loadFacts();
      const data = reportStats.getUtilisation(rangeFromQuery(req.query), facts);
      return res.status(200).json({ data });
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  "/export",
  requireRoles("ADMIN", "VIEWER"),
  validate({ query: rangeQuerySchema.extend({ report: z.string().max(40) }) }),
  async (req, res, next) => {
    try {
      const report = req.query.report || "summary";
      if (!reportStats.CSV_REPORTS.includes(report)) {
        return next(
          new Error(`Unknown report "${report}" — expected one of ${reportStats.CSV_REPORTS.join(", ")}`),
        );
      }
      const facts = await reportStats.loadFacts();
      const range = rangeFromQuery(req.query);
      const csv = reportStats.buildCsv(report, range, facts);
      const from = range.from || "";
      const to = range.to || "";
      res.set("Content-Type", "text/csv; charset=utf-8");
      res.set(
        "Content-Disposition",
        `attachment; filename="${report}_${from}_${to}.csv"`,
      );
      return res.status(200).send(csv);
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
