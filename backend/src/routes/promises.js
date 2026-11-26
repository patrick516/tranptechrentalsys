// Payment and return promise tracking routes (/api/v1/promises)
const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const { validate } = require("../middleware/validate");
const PromiseModel = require("../models/Promise");
const Customer = require("../models/Customer");
const { toBusinessDate } = require("../utils/dates");
const { writeAuditLog } = require("../utils/audit");
const { AppError } = require("../middleware/errors");

const router = express.Router();

const createPromiseSchema = z.object({
  customerId: z.string().trim().min(1),
  bookingId: z.string().trim().optional().nullable().default(null),
  kind: z.enum(["PAYMENT", "RETURN"]),
  promisedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  promisedAmount: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable()
    .default(null),
  notes: z.string().trim().max(500).optional().default(""),
});

const updatePromiseStatusSchema = z.object({
  status: z.enum(["PENDING", "KEPT", "BROKEN", "CANCELLED"]),
  notes: z.string().trim().max(500).optional(),
});

router.use(requireAuth);

router.get(
  "/",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  async (req, res, next) => {
    try {
      const filter = {};
      if (
        req.query.status &&
        ["PENDING", "KEPT", "BROKEN", "CANCELLED"].includes(req.query.status)
      ) {
        filter.status = req.query.status;
      }
      if (req.query.customerId) {
        filter.customerId = req.query.customerId;
      }
      if (req.query.overdue === "true") {
        filter.status = "PENDING";
        filter.promisedDate = { $lt: toBusinessDate() };
      }

      const items = await PromiseModel.find(filter)
        .populate("customerId", "code name status contacts")
        .populate("bookingId", "code status endDate qtyOut")
        .sort({ promisedDate: 1, createdAt: -1 })
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
  validate({ body: createPromiseSchema }),
  async (req, res, next) => {
    try {
      const customer = await Customer.findById(req.body.customerId).lean();
      if (!customer) {
        return next(new AppError("Customer not found", 404, "NOT_FOUND"));
      }

      const promiseDoc = await PromiseModel.create({
        ...req.body,
        status: "PENDING",
        createdBy: req.user._id,
      });

      await writeAuditLog({
        userId: req.user._id,
        action: "PROMISE_CREATED",
        entityType: "PROMISE",
        entityId: promiseDoc._id,
        after: {
          customerId: customer._id,
          kind: promiseDoc.kind,
          promisedDate: promiseDoc.promisedDate,
          promisedAmount: promiseDoc.promisedAmount,
        },
        req,
      });

      return res.status(201).json({ data: promiseDoc });
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  "/:id/status",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: updatePromiseStatusSchema }),
  async (req, res, next) => {
    try {
      const promiseDoc = await PromiseModel.findById(req.params.id);
      if (!promiseDoc) {
        return next(new AppError("Promise not found", 404, "NOT_FOUND"));
      }

      const prevStatus = promiseDoc.status;
      promiseDoc.status = req.body.status;
      if (req.body.notes) {
        promiseDoc.notes = promiseDoc.notes
          ? `${promiseDoc.notes}\n${req.body.notes}`
          : req.body.notes;
      }
      await promiseDoc.save();

      await writeAuditLog({
        userId: req.user._id,
        action: "PROMISE_STATUS_UPDATED",
        entityType: "PROMISE",
        entityId: promiseDoc._id,
        before: { status: prevStatus },
        after: { status: promiseDoc.status },
        req,
      });

      return res.status(200).json({ data: promiseDoc });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
