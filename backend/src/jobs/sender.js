// Outbound sender worker (spec 8.5): drains the queue every minute — quiet
// hours, daily cap, one automatic message per contact per day, retries with
// growing delays and a fallback to the other SIM after the second failure.
const Message = require("../models/Message");
const Settings = require("../models/Settings");
const env = require("../config/env");
const logger = require("../lib/logger");
const textbee = require("../services/sms/textbee");
const whatsapp = require("../services/whatsapp/client");
const { toBusinessDate } = require("../utils/dates");

// 5 min, 30 min, 2 h, 6 h — then the message becomes FAILED (spec 8.5)
const RETRY_DELAYS_MIN = [5, 30, 120, 360];
const MAX_ATTEMPTS = RETRY_DELAYS_MIN.length + 1;
const SEND_SPACING_MS = 2000; // space sends so the phone is not rate-limited
const QUIET_START = Number(process.env.SMS_QUIET_START || 19); // Africa/Blantyre
const QUIET_END = Number(process.env.SMS_QUIET_END || 7);
const AUTOMATIC_KEYS = new Set(["CUSTOM", "MANUAL", ""]);

function localHour(now, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone,
  });
  return Number(fmt.format(now));
}

// No automatic SMS between 19:00 and 07:00 (spec 8.6). Queued messages wait.
function inQuietHours(now, timeZone = env.tz) {
  const hour = localHour(now, timeZone);
  return hour >= QUIET_START || hour < QUIET_END;
}

function startOfBusinessDay(now = new Date()) {
  return new Date(`${toBusinessDate(now)}T00:00:00+02:00`);
}

// Next 07:00 Africa/Blantyre (fixed UTC+2, no DST) — used to defer messages
// that hit the per-contact daily limit.
function nextMorning(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: env.tz,
  });
  const [y, m, d] = fmt.format(now).split("-").map(Number);
  const pad = (n) => String(n).padStart(2, "0");
  const todayAt = new Date(`${y}-${pad(m)}-${pad(d)}T07:00:00+02:00`);
  if (todayAt.getTime() > now.getTime()) return todayAt;
  const next = new Date(Date.UTC(y, m - 1, d) + 86_400_000);
  return new Date(
    `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}T07:00:00+02:00`,
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Configuration problems and the gateway's 400/401 answers will not fix
// themselves — fail immediately instead of burning the retry ladder (8.5).
function isTerminal(err) {
  if (
    err.code === "TEXTBEE_NOT_CONFIGURED" ||
    err.code === "WHATSAPP_NOT_CONFIGURED"
  ) {
    return true;
  }
  return err.status === 400 || err.status === 401;
}

async function recordFailure(msg, err, now) {
  msg.attempts = (msg.attempts || 0) + 1;
  msg.error = err.message || String(err);
  if (isTerminal(err) || msg.attempts >= MAX_ATTEMPTS) {
    msg.status = "FAILED";
    msg.nextRetryAt = null;
  } else {
    const delay = RETRY_DELAYS_MIN[msg.attempts - 1];
    msg.status = "QUEUED";
    msg.nextRetryAt = new Date(now.getTime() + delay * 60_000);
  }
  await msg.save();
  logger.warn("Message send failed", {
    id: String(msg._id),
    channel: msg.channel,
    attempts: msg.attempts,
    nextRetryAt: msg.nextRetryAt,
    error: msg.error,
  });
}

async function sendOne(msg, { mode, now }) {
  if (msg.channel === "SMS") {
    const primary = textbee.deviceFor(msg.network);
    // After the second failure the other SIM is tried (spec 8.5).
    const useAlternate = (msg.attempts || 0) >= 2;
    const device = useAlternate ? textbee.alternateFor(msg.network) : primary;
    if (useAlternate && device.deviceId !== primary.deviceId) {
      msg.fallbackUsed = true;
    }
    msg.deviceId = device.deviceId;
    msg.senderNumber = device.senderNumber;

    const result = await textbee.sendSms({
      toPhone: msg.toPhone,
      body: msg.body,
      deviceId: device.deviceId,
      mode,
    });
    msg.status = "SENT";
    msg.sentAt = new Date();
    msg.providerMessageId = result.providerMessageId;
    msg.error = "";
    msg.nextRetryAt = null;
    await msg.save();
    if (mode === "live") await sleep(SEND_SPACING_MS);
    return;
  }

  // WhatsApp leftovers (the route usually sends these inline already).
  if (!whatsapp.isConfigured()) {
    const err = new Error(
      "WhatsApp Cloud API is not configured — set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env",
    );
    err.code = "WHATSAPP_NOT_CONFIGURED";
    throw err;
  }
  const result = await whatsapp.send({
    toPhone: msg.toPhone,
    templateKey: msg.templateKey,
    vars: { body: msg.body },
    body: msg.body,
  });
  msg.status = "SENT";
  msg.sentAt = new Date();
  msg.providerMessageId = result.providerMessageId || null;
  msg.error = "";
  msg.nextRetryAt = null;
  await msg.save();
}

async function processQueuedMessages({ limit = 25, now = new Date() } = {}) {
  // Reclaim anything stuck in SENDING after a crash mid-call.
  await Message.updateMany(
    {
      status: "SENDING",
      updatedAt: { $lt: new Date(now.getTime() - 2 * 60_000) },
    },
    { $set: { status: "QUEUED", nextRetryAt: now } },
  );

  const due = await Message.find({
    direction: { $ne: "IN" },
    status: "QUEUED",
    $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
    $and: [{ $or: [{ scheduledAt: null }, { scheduledAt: { $lte: now } }] }],
  })
    .sort({ createdAt: 1 })
    .limit(limit);

  if (!due.length) return { processed: 0, sent: 0, failed: 0, skipped: 0 };

  const settings = (await Settings.findOne({ key: "default" }).lean()) || {};
  const mode = settings.smsMode || env.textbee.smsMode || "log";
  const cap = settings.smsDailyCap ?? env.textbee.dailyCap;
  const dayStart = startOfBusinessDay(now);
  const quiet = inQuietHours(now, env.tz);

  // The daily cap counts real sends only; log mode records without sending.
  let usedToday = 0;
  if (mode === "live") {
    usedToday = await Message.countDocuments({
      direction: { $ne: "IN" },
      channel: "SMS",
      status: { $in: ["SENDING", "SENT", "DELIVERED", "READ"] },
      createdAt: { $gte: dayStart },
    });
  }
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const msg of due) {
    const isAutomatic = !AUTOMATIC_KEYS.has(String(msg.templateKey || "").trim());

    if (msg.channel === "SMS") {
      // Daily cap: the rest stay queued and the owner sees a warning (8.6).
      if (mode === "live" && usedToday >= cap) {
        skipped += 1;
        continue;
      }
      // Quiet hours only hold real sends; log mode records immediately.
      if (mode === "live" && quiet) {
        skipped += 1;
        continue;
      }
      // At most one automatic message per contact per day (8.6).
      if (isAutomatic) {
        const todayToContact = await Message.countDocuments({
          toPhone: msg.toPhone,
          direction: { $ne: "IN" },
          channel: "SMS",
          status: { $in: ["SENDING", "SENT", "DELIVERED", "READ"] },
          createdAt: { $gte: dayStart },
        });
        if (todayToContact >= 1) {
          msg.nextRetryAt = nextMorning(now); // at most one per day (8.6)
          await msg.save();
          skipped += 1;
          continue;
        }
      }
    }

    msg.status = "SENDING";
    await msg.save();

    try {
      await sendOne(msg, { mode, now });
      sent += 1;
      if (msg.channel === "SMS" && mode === "live") usedToday += 1;
    } catch (err) {
      await recordFailure(msg, err, now);
      failed += 1;
    }
  }

  if (sent || failed || skipped) {
    logger.info("Sender worker run", { sent, failed, skipped, mode });
  }
  return { processed: due.length, sent, failed, skipped };
}

module.exports = {
  processQueuedMessages,
  inQuietHours,
  startOfBusinessDay,
  nextMorning,
  RETRY_DELAYS_MIN,
  MAX_ATTEMPTS,
};
