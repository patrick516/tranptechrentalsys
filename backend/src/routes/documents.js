// Document record & lookup routes (/api/v1/documents)
const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const { validate } = require("../middleware/validate");
const Document = require("../models/Document");
const { writeAuditLog } = require("../utils/audit");

const router = express.Router();

const createDocumentSchema = z.object({
  customerId: z.string().trim().optional().nullable().default(null),
  bookingId: z.string().trim().optional().nullable().default(null),
  kind: z.enum([
    "NATIONAL_ID",
    "CONTRACT",
    "PAYMENT_PROOF",
    "REPORT_EXPORT",
    "OTHER",
  ]),
  folder: z.string().trim().max(80).optional().default("general"),
  title: z.string().trim().min(1).max(200),
  storageProvider: z.enum(["CLOUDINARY", "LOCAL"]).optional().default("LOCAL"),
  publicId: z.string().trim().max(200).optional().default(""),
  url: z.string().trim().min(1).max(1000),
  mimeType: z
    .string()
    .trim()
    .max(120)
    .optional()
    .default("application/octet-stream"),
  sizeBytes: z.number().int().nonnegative().optional().default(0),
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

      const items = await Document.find(filter).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ data: items });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  "/",
  requireRoles("ADMIN", "STAFF"),
  validate({ body: createDocumentSchema }),
  async (req, res, next) => {
    try {
      const doc = await Document.create({
        ...req.body,
        uploadedBy: req.user._id,
      });

      await writeAuditLog({
        userId: req.user._id,
        action: "DOCUMENT_CREATED",
        entityType: "DOCUMENT",
        entityId: doc._id,
        after: { title: doc.title, kind: doc.kind },
        req,
      });

      return res.status(201).json({ data: doc });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
