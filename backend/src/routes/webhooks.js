const express = require("express");
const logger = require("../lib/logger");
const {
  verifyChallenge,
  isValidSignature,
} = require("../services/whatsapp/webhook");
const { parseStatusWebhook } = require("../services/whatsapp/client");
const Message = require("../models/Message");

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

module.exports = router;
