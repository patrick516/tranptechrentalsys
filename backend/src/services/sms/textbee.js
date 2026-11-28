// TextBee SMS gateway client (https://textbee.dev/docs).
// Sends through an Android phone registered in TextBee and verifies the
// signed webhooks the gateway calls back with.
//
//   POST {TEXTBEE_BASE_URL}/gateway/send-sms   header: x-api-key
//   webhook: X-Textbee-Signature: t=<unix>,v1=<hmac-sha256 of "<t>.<raw body>">
const crypto = require("crypto");
const env = require("../../config/env");
const logger = require("../../lib/logger");
const { maskPhone } = require("../../utils/phone");

const BASE_URL = (
  process.env.TEXTBEE_BASE_URL || "https://api.textbee.dev/api/v1"
).replace(/\/+$/, "");
const SIGNATURE_TOLERANCE_SECONDS = 300;

function looksPlaceholder(value) {
  return !value || /^placehol/i.test(value) || /^replace_with/i.test(value);
}

function isConfigured() {
  return !looksPlaceholder(env.textbee.apiKey);
}

function defaultNetwork() {
  const value = (process.env.TEXTBEE_DEFAULT_NETWORK || "AIRTEL").toUpperCase();
  return value === "TNM" ? "TNM" : "AIRTEL";
}

// Spec 8.3: sender follows the recipient's network; unknown networks use the
// default sender from configuration.
function deviceFor(network) {
  const t = env.textbee;
  const label = network === "TNM" ? "TNM" : network === "AIRTEL" ? "AIRTEL" : defaultNetwork();
  if (label === "TNM") {
    return { label, deviceId: t.deviceTnm || null, senderNumber: t.senderTnm || null };
  }
  return { label, deviceId: t.deviceAirtel || null, senderNumber: t.senderAirtel || null };
}

// Spec 8.5: after the second failure the other SIM is tried.
function alternateFor(network) {
  const primary = deviceFor(network);
  const otherLabel = primary.label === "AIRTEL" ? "TNM" : "AIRTEL";
  return deviceFor(otherLabel);
}

async function sendSms({ toPhone, body, deviceId = null, mode = "log" }) {
  if (mode !== "live") {
    logger.info("SMS log mode — recorded, not sent", { toPhone: maskPhone(toPhone) });
    return { status: "SENT", providerMessageId: null, mode: "log" };
  }

  if (!isConfigured()) {
    const err = new Error(
      "TextBee API key is not configured — set TEXTBEE_API_KEY in .env",
    );
    err.code = "TEXTBEE_NOT_CONFIGURED";
    err.status = 503;
    throw err;
  }

  const payload = { recipients: [toPhone], message: body };
  if (deviceId) payload.deviceId = deviceId;

  const res = await fetch(`${BASE_URL}/gateway/send-sms`, {
    method: "POST",
    headers: {
      "x-api-key": env.textbee.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      (typeof json?.error === "string" && json.error) ||
      json?.message ||
      `TextBee returned ${res.status}`;
    const err = new Error(detail);
    err.code = "TEXTBEE_API_ERROR";
    err.status = res.status;
    throw err;
  }

  return {
    status: "SENT",
    providerMessageId: json?.data?.smsBatchId || null,
    warning: json?.data?.warning || null,
  };
}

// X-Textbee-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">
function verifyWebhookSignature(rawBody, header) {
  const secret = env.textbee.webhookSecret;
  if (looksPlaceholder(secret)) return false;
  if (!header || typeof header !== "string") return false;

  const parts = {};
  for (const chunk of header.split(",")) {
    const idx = chunk.indexOf("=");
    if (idx > 0) parts[chunk.slice(0, idx).trim()] = chunk.slice(idx + 1).trim();
  }
  const t = Number(parts.t);
  if (!t || !parts.v1) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - t);
  if (age > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${rawBody.toString("utf8")}`)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parts.v1, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Normalises the five TextBee webhook events into one shape (spec 8.5).
function parseWebhook(payload = {}) {
  const event = String(payload.webhookEvent || "");
  const base = {
    event,
    smsId: payload.smsId || null,
    smsBatchId: payload.smsBatchId || null,
    deviceId: payload.deviceId || null,
    idempotencyKey: payload.idempotencyKey || null,
    recipient: payload.recipient || null,
  };

  if (event === "MESSAGE_RECEIVED") {
    return {
      ...base,
      type: "INBOUND",
      from: payload.sender || null,
      body: String(payload.message || ""),
      receivedAt: payload.receivedAt || null,
    };
  }
  if (event === "MESSAGE_SENT") {
    return { ...base, type: "STATUS", status: "SENT", at: payload.sentAt || null };
  }
  if (event === "MESSAGE_DELIVERED") {
    return { ...base, type: "STATUS", status: "DELIVERED", at: payload.deliveredAt || null };
  }
  if (event === "MESSAGE_FAILED") {
    return {
      ...base,
      type: "STATUS",
      status: "FAILED",
      error:
        payload.errorMessage ||
        payload.errorName ||
        "The phone could not send this message",
      at: payload.failedAt || null,
    };
  }
  if (event === "UNKNOWN_STATE") {
    // Never move a message backwards on an ambiguous report (spec 8.5).
    return { ...base, type: "STATUS", status: null, note: String(payload.status || "") };
  }
  return { ...base, type: "UNKNOWN" };
}

// delivered/failed are final; nothing may move a message back to an earlier state.
function canApplyStatus(current, next) {
  if (!next) return false;
  if (current === "DELIVERED" || current === "READ" || current === "FAILED") {
    return false;
  }
  if (next === "FAILED") return true;
  const order = ["QUEUED", "SENDING", "SENT", "DELIVERED", "READ"];
  return order.indexOf(next) > order.indexOf(current);
}

module.exports = {
  BASE_URL,
  isConfigured,
  defaultNetwork,
  deviceFor,
  alternateFor,
  sendSms,
  verifyWebhookSignature,
  parseWebhook,
  canApplyStatus,
};
