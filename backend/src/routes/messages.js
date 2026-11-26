// Outbound WhatsApp & SMS queue and history routes (/api/v1/messages)
const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const { validate } = require("../middleware/validate");
const Message = require("../models/Message");
const Customer = require("../models/Customer");
const Settings = require("../models/Settings");
const { normalizePhone, detectNetwork } = require("../utils/phone");
const { toBusinessDate } = require("../utils/dates");
const { writeAuditLog } = require("../utils/audit");
const { AppError } = require("../middleware/errors");

const router = express.Router();

const sendMessageSchema = z.object({
  customerId: z.string().trim().min(1),
  bookingId: z.string().trim().optional().nullable().default(null),
  contactId: z.string().trim().optional(),
  channel: z.enum(["WHATSAPP", "SMS"]),
  templateKey: z.string().trim().max(80).optional().default("CUSTOM"),
  body: z.string().trim().min(1).max(1000),
});

router.use(requireAuth);

router.get(
  "/",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  async (req, res, next) => {
    try {
      const filter = {};
      if (req.query.customerId) filter.customerId = req.query.customerId;
      if (req.query.status) filter.status = req.query.status;

      const items = await Message.find(filter)
        .populate("customerId", "code name")
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
  validate({ body: sendMessageSchema }),
  async (req, res, next) => {
    try {
      const customer = await Customer.findById(req.body.customerId).lean();
      if (!customer) {
        return next(new AppError("Customer not found", 404, "NOT_FOUND"));
      }

      const contact =
        (req.body.contactId &&
          customer.contacts.find(
            (c) => String(c._id) === req.body.contactId,
          )) ||
        customer.contacts.find((c) => c.isPrimary) ||
        customer.contacts[0];

      if (!contact) {
        return next(
          new AppError(
            "Customer has no contact phone number",
            400,
            "VALIDATION_ERROR",
          ),
        );
      }

      if (req.body.channel === "SMS" && contact.smsOptOut) {
        return next(
          new AppError(
            "Contact has opted out of SMS reminders",
            400,
            "SMS_OPT_OUT",
          ),
        );
      }

      const normalizedPhone = normalizePhone(contact.phone);
      if (!normalizedPhone) {
        return next(
          new AppError(
            "Invalid phone number on contact",
            400,
            "VALIDATION_ERROR",
          ),
        );
      }

      const settings = await Settings.findOne({ key: "default" }).lean();
      const smsDailyCap = settings?.smsDailyCap ?? 100;

      if (req.body.channel === "SMS") {
        const today = toBusinessDate();
        const startOfDay = new Date(`${today}T00:00:00+02:00`);
        const sentTodayCount = await Message.countDocuments({
          channel: "SMS",
          createdAt: { $gte: startOfDay },
        });
        if (sentTodayCount >= smsDailyCap) {
          return next(
            new AppError(
              `Daily SMS cap (${smsDailyCap}) reached`,
              429,
              "SMS_DAILY_CAP_REACHED",
            ),
          );
        }
      }

      const network = detectNetwork(
        normalizedPhone,
        settings?.phonePrefixes,
        contact.network || null,
      );

      const initialStatus = settings?.smsMode === "live" ? "QUEUED" : "SENT";

      const msg = await Message.create({
        customerId: customer._id,
        bookingId: req.body.bookingId || null,
        contactName: contact.name,
        toPhone: normalizedPhone,
        network,
        channel: req.body.channel,
        templateKey: req.body.templateKey,
        body: req.body.body,
        status: initialStatus,
        sentAt: initialStatus === "SENT" ? new Date() : null,
        createdBy: req.user._id,
      });

      await writeAuditLog({
        userId: req.user._id,
        action: "MESSAGE_QUEUED",
        entityType: "MESSAGE",
        entityId: msg._id,
        after: {
          customerId: customer._id,
          toPhone: normalizedPhone,
          channel: msg.channel,
          status: msg.status,
        },
        req,
      });

      return res.status(201).json({ data: msg });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
