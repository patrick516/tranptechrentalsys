// Business settings read and update routes (/api/v1/settings)
const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const { validate } = require("../middleware/validate");
const Settings = require("../models/Settings");
const { writeAuditLog } = require("../utils/audit");

const router = express.Router();

const updateSettingsSchema = z.object({
  businessName: z.string().trim().min(1).max(160).optional(),
  ratePerChairPerDay: z.number().int().nonnegative().optional(),
  lateFeePerDay: z.number().int().nonnegative().optional(),
  graceDays: z.number().int().nonnegative().optional(),
  depositRequiredDefault: z.boolean().optional(),
  smsDailyCap: z.number().int().nonnegative().optional(),
  smsMode: z.enum(["live", "log"]).optional(),
});

router.use(requireAuth);

router.get(
  "/",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  async (_req, res, next) => {
    try {
      let doc = await Settings.findOne({ key: "default" }).lean();
      if (!doc) {
        doc = (await Settings.create({ key: "default" })).toObject();
      }
      return res.status(200).json({ data: doc });
    } catch (err) {
      return next(err);
    }
  },
);

router.put(
  "/",
  requireRoles("ADMIN"),
  validate({ body: updateSettingsSchema }),
  async (req, res, next) => {
    try {
      const beforeDoc = await Settings.findOne({ key: "default" }).lean();
      const updated = await Settings.findOneAndUpdate(
        { key: "default" },
        {
          $set: {
            ...req.body,
            updatedBy: req.user._id,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean();

      await writeAuditLog({
        userId: req.user._id,
        action: "SETTINGS_UPDATED",
        entityType: "SETTINGS",
        entityId: updated._id,
        before: beforeDoc,
        after: updated,
        req,
      });

      return res.status(200).json({ data: updated });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
