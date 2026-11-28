const express = require("express");
const logger = require("../lib/logger");
const {
  verifyChallenge,
  isValidSignature,
} = require("../services/whatsapp/webhook");
const { parseStatusWebhook } = require("../services/whatsapp/client");
const textbee = require("../services/sms/textbee");
const Message = require("../models/Message");
const Customer = require("../models/Customer");
const { normalizePhone, detectNetwork } = require("../utils/phone");

const router = express.Router();

// Meta's verification handshake: GET /api/v1/webhooks/whatsapp
router.get("/whatsapp", (req, res) => {
  const challenge = verifyChallenge(req.query);
  if (!challenge) return res.status(403).send("Verification failed");
  return res.status(200).send(challenge);
});

// Delivery status and inbound replies: POST /api/v1/webhooks/whatsapp
router.post("/whatsapp", async (req, res) => {
  const signature = req.get("X-Hub-Signature-256");
  if (!isValidSignature(req.rawBody || Buffer.from(""), signature)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  try {
    const updates = parseStatusWebhook(req.body);

    for (const update of updates) {
      if (update.type === "INBOUND") {
        logger.info("WhatsApp inbound message", {
          from: update.from,
          body: update.body,
        });
        continue;
      }

      const statusMap = {
        SENT: "SENT",
        DELIVERED: "DELIVERED",
        READ: "READ",
        FAILED: "FAILED",
      };
      const mapped = statusMap[update.status];
      if (!mapped || !update.providerMessageId) continue;

      await Message.updateOne(
        { providerMessageId: update.providerMessageId },
        {
          $set: {
            status: mapped,
            error: update.error || "",
          },
        },
      );
    }

    return res.status(200).json({ data: { received: true, events: updates.length } });
  } catch (err) {
    logger.error("WhatsApp webhook failed", { message: err.message });
    return res.status(200).json({ data: { received: true, error: true } });
  }
});

// Applies one TextBee status event to the outbound message it belongs to.
// Events are not ordered: never move a message backwards (spec 8.5).
async function applyTextbeeStatus(parsed) {
  if (!parsed.smsBatchId && !parsed.smsId) return;

  const or = [];
  if (parsed.smsBatchId) or.push({ providerMessageId: parsed.smsBatchId });
  if (parsed.smsId) {
    or.push({ providerMessageId: parsed.smsId });
    or.push({ providerSmsId: parsed.smsId });
  }
  if (!or.length) return;

  const msg = await Message.findOne({ $or: or }).sort({ createdAt: -1 });
  if (!msg) return;
  // A retried delivery carries the same key — process it once.
  if (parsed.idempotencyKey && msg.webhookIdempotencyKey === parsed.idempotencyKey) {
    return;
  }
  if (!textbee.canApplyStatus(msg.status, parsed.status)) return;

  if (parsed.smsId) msg.providerSmsId = parsed.smsId;
  msg.status = parsed.status;
  if (parsed.status === "FAILED") {
    msg.error = parsed.error || "The phone could not send this message";
  }
  if (parsed.idempotencyKey) msg.webhookIdempotencyKey = parsed.idempotencyKey;
  await msg.save();
}

// Stores an inbound SMS, matched to a customer by phone number (spec 8.5).
async function storeInbound(parsed) {
  const sender = normalizePhone(parsed.from || "");
  if (!sender) return;

  if (parsed.idempotencyKey) {
    const seen = await Message.findOne({
      webhookIdempotencyKey: parsed.idempotencyKey,
    }).lean();
    if (seen) return;
  }

  const digits = sender.replace(/\D/g, "").slice(-9);
  const customer = digits
    ? await Customer.findOne({ "contacts.phone": { $regex: digits } }).lean()
    : null;
  const contact = customer?.contacts?.find(
    (c) => (normalizePhone(c.phone) || "").slice(-9) === digits,
  );

  try {
    await Message.create({
      customerId: customer?._id || null,
      contactName: contact?.name || "",
      toPhone: sender,
      network: detectNetwork(sender),
      channel: "SMS",
      direction: "IN",
      status: "RECEIVED",
      templateKey: "INBOUND",
      body: parsed.body,
      sentAt: parsed.receivedAt ? new Date(parsed.receivedAt) : new Date(),
      deviceId: parsed.deviceId || null,
      webhookIdempotencyKey: parsed.idempotencyKey || null,
    });
  } catch (err) {
    if (err?.code !== 11000) throw err; // duplicate delivery — already stored
  }
}

// TextBee delivery status and inbound SMS: POST /api/v1/webhooks/textbee
// Signature: X-Textbee-Signature: t=<unix>,v1=<hmac-sha256 of "<t>.<raw body>">
router.post("/textbee", async (req, res) => {
  const raw = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from("");
  if (!textbee.verifyWebhookSignature(raw, req.get("X-Textbee-Signature"))) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  try {
    const parsed = textbee.parseWebhook(req.body || {});
    if (parsed.type === "STATUS") {
      await applyTextbeeStatus(parsed);
    } else if (parsed.type === "INBOUND") {
      await storeInbound(parsed);
    }
    return res
      .status(200)
      .json({ data: { received: true, event: parsed.event || null } });
  } catch (err) {
    logger.error("TextBee webhook failed", { message: err.message });
    return res.status(200).json({ data: { received: true, error: true } });
  }
});

module.exports = router;
