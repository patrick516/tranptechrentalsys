// Ledger adjustments, fee waivers, and entry voiding routes (/api/v1/ledger)
const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const { validate } = require("../middleware/validate");
const LedgerEntry = require("../models/LedgerEntry");
const Customer = require("../models/Customer");
const Booking = require("../models/Booking");
const { toBusinessDate } = require("../utils/dates");
const { writeAuditLog } = require("../utils/audit");
const { AppError } = require("../middleware/errors");
const Payment = require("../models/Payment");
const {
  calcChargesTotal,
  calcPaymentsTotal,
} = require("../services/ledger.calc");

const router = express.Router();

const adjustmentSchema = z.object({
  customerId: z.string().trim().min(1),
  bookingId: z.string().trim().optional().nullable().default(null),
  type: z
    .enum(["ADJUSTMENT", "DAMAGE_FEE", "LOSS_FEE", "DEPOSIT"])
    .optional()
    .default("ADJUSTMENT"),
  amount: z
    .number()
    .int()
    .refine((v) => v !== 0, { message: "Amount must be non-zero integer" }),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  description: z.string().trim().max(300).optional().default(""),
  reason: z.string().trim().min(1).max(500),
});

const voidEntrySchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

router.use(requireAuth);

router.get(
  "/",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  async (req, res, next) => {
    try {
      const filter = {};
      if (req.query.customerId) filter.customerId = req.query.customerId;
      if (req.query.bookingId) filter.bookingId = req.query.bookingId;
      if (req.query.includeVoided !== "true") {
        filter.voidedAt = null;
      }

      const items = await LedgerEntry.find(filter)
        .populate("customerId", "code name")
        .sort({ date: -1, createdAt: -1 })
        .lean();

      return res.status(200).json({ data: items });
    } catch (err) {
      return next(err);
    }
  },
);

// Balance summary for one customer: charged, paid, and what is still owing.
// Positive balance = customer owes money; negative = customer is in credit.
router.get(
  "/balance/:customerId",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  async (req, res, next) => {
    try {
      const { customerId } = req.params;
      const customer = await Customer.findById(customerId).lean();
      if (!customer) {
        return next(new AppError("Customer not found", 404, "NOT_FOUND"));
      }
      const [entries, payments] = await Promise.all([
        LedgerEntry.find({ customerId }).lean(),
        Payment.find({ customerId }).lean(),
      ]);
      const charged = calcChargesTotal(entries);
      const paid = calcPaymentsTotal(payments);
      return res.status(200).json({
        data: { charged, paid, balance: charged - paid },
      });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  "/adjustments",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: adjustmentSchema }),
  async (req, res, next) => {
    try {
      const customer = await Customer.findById(req.body.customerId).lean();
      if (!customer) {
        return next(new AppError("Customer not found", 404, "NOT_FOUND"));
      }

      if (req.body.bookingId) {
        const booking = await Booking.findById(req.body.bookingId).lean();
        if (!booking) {
          return next(new AppError("Booking not found", 404, "NOT_FOUND"));
        }
      }

      const businessDate = req.body.date || toBusinessDate();
      const dueDate = req.body.dueDate || businessDate;

      const entry = await LedgerEntry.create({
        customerId: customer._id,
        bookingId: req.body.bookingId || null,
        type: req.body.type,
        date: businessDate,
        dueDate,
        qty: null,
        unitAmount: null,
        amount: req.body.amount,
        description:
          req.body.description || `${req.body.type}: ${req.body.reason}`,
        source: "MANUAL",
        reason: req.body.reason,
        createdBy: req.user._id,
      });

      await writeAuditLog({
        userId: req.user._id,
        action: "LEDGER_ADJUSTMENT_CREATED",
        entityType: "LEDGER_ENTRY",
        entityId: entry._id,
        after: {
          customerId: customer._id,
          bookingId: entry.bookingId,
          type: entry.type,
          amount: entry.amount,
          reason: entry.reason,
        },
        req,
      });

      return res.status(201).json({ data: entry });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  "/:id/void",
  requireRoles("ADMIN"),
  validate({ body: voidEntrySchema }),
  async (req, res, next) => {
    try {
      const entry = await LedgerEntry.findById(req.params.id);
      if (!entry) {
        return next(new AppError("Ledger entry not found", 404, "NOT_FOUND"));
      }
      if (entry.voidedAt) {
        return next(
          new AppError(
            "Ledger entry is already voided",
            400,
            "INVALID_TRANSITION",
          ),
        );
      }

      entry.voidedAt = new Date();
      entry.voidReason = req.body.reason;
      entry.voidedBy = req.user._id;
      await entry.save();

      await writeAuditLog({
        userId: req.user._id,
        action: "LEDGER_ENTRY_VOIDED",
        entityType: "LEDGER_ENTRY",
        entityId: entry._id,
        after: { voidedAt: entry.voidedAt, reason: req.body.reason },
        req,
      });

      return res.status(200).json({ data: entry });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
