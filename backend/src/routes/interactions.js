// Customer interaction logging routes (/api/v1/interactions)
const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const { validate } = require("../middleware/validate");
const Interaction = require("../models/Interaction");
const Customer = require("../models/Customer");
const { writeAuditLog } = require("../utils/audit");
const { AppError } = require("../middleware/errors");

const router = express.Router();

const createInteractionSchema = z.object({
  customerId: z.string().trim().min(1),
  bookingId: z.string().trim().optional().nullable().default(null),
  channel: z.enum(["PHONE", "WHATSAPP", "SMS", "VISIT", "OTHER"]),
  summary: z.string().trim().min(1).max(1000),
  followUpDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable()
    .default(null),
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

      const items = await Interaction.find(filter)
        .sort({ createdAt: -1 })
        .limit(200)
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
  validate({ body: createInteractionSchema }),
  async (req, res, next) => {
    try {
      const customer = await Customer.findById(req.body.customerId).lean();
      if (!customer) {
        return next(new AppError("Customer not found", 404, "NOT_FOUND"));
      }

      const doc = await Interaction.create({
        ...req.body,
        createdBy: req.user._id,
      });

      await writeAuditLog({
        userId: req.user._id,
        action: "INTERACTION_LOGGED",
        entityType: "INTERACTION",
        entityId: doc._id,
        after: { customerId: customer._id, channel: doc.channel },
        req,
      });

      return res.status(201).json({ data: doc });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
