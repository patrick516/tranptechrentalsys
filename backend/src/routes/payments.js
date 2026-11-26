// Payment recording and voiding routes (/api/v1/payments)
const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const { validate } = require("../middleware/validate");
const Payment = require("../models/Payment");
const Customer = require("../models/Customer");
const Booking = require("../models/Booking");
const PromiseModel = require("../models/Promise");
const { toBusinessDate } = require("../utils/dates");
const { writeAuditLog } = require("../utils/audit");
const { AppError } = require("../middleware/errors");

const router = express.Router();

const createPaymentSchema = z.object({
  customerId: z.string().trim().min(1),
  bookingId: z.string().trim().optional().nullable().default(null),
  amount: z.number().int().positive(),
  paidDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  method: z.enum(["AIRTEL_MONEY", "MPAMBA", "CASH", "BANK", "OTHER"]),
  reference: z.string().trim().max(120).optional().default(""),
  payerName: z.string().trim().max(120).optional().default(""),
  payerPhone: z.string().trim().max(30).optional().default(""),
});

const voidPaymentSchema = z.object({
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
      if (
        req.query.status &&
        ["CONFIRMED", "VOID"].includes(req.query.status)
      ) {
        filter.status = req.query.status;
      }
      const items = await Payment.find(filter)
        .populate("customerId", "code name")
        .sort({ paidDate: -1, createdAt: -1 })
        .lean();
      return res.status(200).json({ data: items });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  "/",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: createPaymentSchema }),
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

      const paidDate = req.body.paidDate || toBusinessDate();
      const payment = await Payment.create({
        ...req.body,
        paidDate,
        status: "CONFIRMED",
        createdBy: req.user._id,
      });

      // Mark oldest pending PAYMENT promise for this customer as KEPT if covered
      const pendingPromises = await PromiseModel.find({
        customerId: customer._id,
        kind: "PAYMENT",
        status: "PENDING",
      }).sort({ promisedDate: 1 });

      for (const p of pendingPromises) {
        if (!p.promisedAmount || payment.amount >= p.promisedAmount) {
          p.status = "KEPT";
          await p.save();
          break;
        }
      }

      await writeAuditLog({
        userId: req.user._id,
        action: "PAYMENT_RECORDED",
        entityType: "PAYMENT",
        entityId: payment._id,
        after: {
          customerId: customer._id,
          bookingId: payment.bookingId,
          amount: payment.amount,
          method: payment.method,
          paidDate,
        },
        req,
      });

      return res.status(201).json({ data: payment });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  "/:id/void",
  requireRoles("ADMIN"),
  validate({ body: voidPaymentSchema }),
  async (req, res, next) => {
    try {
      const payment = await Payment.findById(req.params.id);
      if (!payment) {
        return next(new AppError("Payment not found", 404, "NOT_FOUND"));
      }
      if (payment.status === "VOID") {
        return next(
          new AppError("Payment is already voided", 400, "INVALID_TRANSITION"),
        );
      }

      payment.status = "VOID";
      payment.voidReason = req.body.reason;
      payment.voidedBy = req.user._id;
      await payment.save();

      await writeAuditLog({
        userId: req.user._id,
        action: "PAYMENT_VOIDED",
        entityType: "PAYMENT",
        entityId: payment._id,
        after: { status: "VOID", reason: req.body.reason },
        req,
      });

      return res.status(200).json({ data: payment });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
