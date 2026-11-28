// WhatsApp webhook: Meta's GET verification handshake, X-Hub-Signature-256
// validation, and parsing of delivery status / inbound replies.
const crypto = require("crypto");
const config = require("../../config/whatsapp");
const { parseStatusWebhook } = require("./client");

// Meta calls this once to verify the callback URL and token.
function verifyChallenge(query = {}) {
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];
  if (mode === "subscribe" && token && token === config.verifyToken) {
    return String(challenge || "");
  }
  return null;
}

// Signature is sha256=<hmac> of the raw request body using the app secret.
function isValidSignature(rawBody, signatureHeader) {
  if (!config.appSecret || !signatureHeader) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", config.appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signatureHeader));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Backwards-compatible helper used by routes/webhooks.js.
function parseWhatsAppWebhook(body = {}) {
  const updates = parseStatusWebhook(body);
  return { received: true, eventCount: updates.length, updates };
}

module.exports = { verifyChallenge, isValidSignature, parseWhatsAppWebhook };
