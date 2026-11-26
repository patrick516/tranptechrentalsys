const express = require("express");
const { parseWhatsAppWebhook } = require("../services/whatsapp/webhook");

const router = express.Router();

router.post("/whatsapp", (req, res) => {
  const parsed = parseWhatsAppWebhook(req.body);
  return res.status(200).json({ data: parsed });
});

module.exports = router;
