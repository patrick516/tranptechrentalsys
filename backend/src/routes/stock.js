const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const { validate } = require("../middleware/validate");
const StockMovement = require("../models/StockMovement");
const Booking = require("../models/Booking");
const { calcAvailabilityRange } = require("../services/stock");
const { toBusinessDate } = require("../utils/dates");
const { writeAuditLog } = require("../utils/audit");
const { AppError } = require("../middleware/errors");

const router = express.Router();

const availabilityQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  excludeBookingId: z.string().optional(),
});

const movementBodySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  type: z.enum([
    "PURCHASE",
    "LOST",
    "DAMAGED",
    "REPAIRED",
    "FOUND",
    "WRITE_OFF",
  ]),
  qty: z.number().int().positive(),
  bookingId: z.string().optional().nullable(),
  note: z.string().trim().max(500).optional().default(""),
});

router.use(requireAuth);

router.get(
  "/availability",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  validate({ query: availabilityQuerySchema }),
  async (req, res, next) => {
    try {
      const { from, to, excludeBookingId } = req.query;
      if (to < from) {
        return next(
          new AppError(
            '"to" date must be on or after "from" date',
            400,
            "VALIDATION_ERROR",
          ),
        );
      }

      const today = toBusinessDate();
      const [movements, bookings] = await Promise.all([
        StockMovement.find({}).lean(),
        Booking.find({
          status: { $in: ["RESERVED", "OUT"] },
          startDate: { $lte: to },
          ...(excludeBookingId ? { _id: { $ne: excludeBookingId } } : {}),
        }).lean(),
      ]);

      const report = calcAvailabilityRange({
        movements,
        bookings,
        fromDate: from,
        toDate: to,
        today,
      });

      return res.status(200).json({ data: report });
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  "/movements",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  async (_req, res, next) => {
    try {
      const items = await StockMovement.find({})
        .sort({ date: -1, createdAt: -1 })
        .lean();
      return res.status(200).json({ data: items });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  "/movements",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: movementBodySchema }),
  async (req, res, next) => {
    try {
      const date = req.body.date || toBusinessDate();
      const movement = await StockMovement.create({
        ...req.body,
        date,
        createdBy: req.user._id,
      });

      await writeAuditLog({
        userId: req.user._id,
        action: "STOCK_MOVEMENT_CREATED",
        entityType: "STOCK_MOVEMENT",
        entityId: movement._id,
        after: { type: movement.type, qty: movement.qty, date: movement.date },
        req,
      });

      return res.status(201).json({ data: movement });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
