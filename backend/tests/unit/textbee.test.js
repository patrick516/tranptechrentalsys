// TextBee client (spec 8): signature verification, webhook parsing, device
// routing by network, log mode, and the sender worker's quiet hours/retries.
import { describe, it, expect } from "vitest";
import { createRequire } from "module";
import crypto from "crypto";

const require = createRequire(import.meta.url);

process.env.NODE_ENV = "test";
process.env.TEXTBEE_API_KEY = "test_key_not_a_placeholder";
process.env.TEXTBEE_WEBHOOK_SECRET = "test_webhook_secret_value_123456";
process.env.TEXTBEE_DEVICE_AIRTEL = "device-airtel";
process.env.TEXTBEE_DEVICE_TNM = "device-tnm";

const textbee = require("../../src/services/sms/textbee");
const env = require("../../src/config/env");
const {
  inQuietHours,
  RETRY_DELAYS_MIN,
  MAX_ATTEMPTS,
} = require("../../src/jobs/sender");

const SECRET = process.env.TEXTBEE_WEBHOOK_SECRET;

function sign(body, secret = SECRET, t = Math.floor(Date.now() / 1000)) {
  const v1 = crypto.createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

describe("TextBee configuration", () => {
  it("is configured when a real API key is present", () => {
    expect(textbee.isConfigured()).toBe(true);
  });

  it("treats placeholder values as not configured", () => {
    const original = env.textbee.apiKey;
    env.textbee.apiKey = "placeholder_abc";
    expect(textbee.isConfigured()).toBe(false);
    env.textbee.apiKey = original;
    expect(textbee.isConfigured()).toBe(true);
  });
});

describe("TextBee device routing by network (spec 8.3)", () => {
  it("uses the Airtel device for AIRTEL numbers", () => {
    const device = textbee.deviceFor("AIRTEL");
    expect(device.label).toBe("AIRTEL");
    expect(device.deviceId).toBe("device-airtel");
    expect(device.senderNumber).toMatch(/^\+265/);
  });

  it("uses the TNM device for TNM numbers", () => {
    const device = textbee.deviceFor("TNM");
    expect(device.label).toBe("TNM");
    expect(device.deviceId).toBe("device-tnm");
  });

  it("falls back to the default network for unknown numbers", () => {
    expect(textbee.deviceFor("OTHER").label).toBe("AIRTEL");
  });

  it("picks the other SIM as the fallback (spec 8.5)", () => {
    expect(textbee.alternateFor("AIRTEL").label).toBe("TNM");
    expect(textbee.alternateFor("TNM").label).toBe("AIRTEL");
  });
});

describe("TextBee sendSms", () => {
  it("records without calling the gateway in log mode", async () => {
    const result = await textbee.sendSms({
      toPhone: "+265991234567",
      body: "Hello",
      mode: "log",
    });
    expect(result).toEqual({ status: "SENT", providerMessageId: null, mode: "log" });
  });

  it("throws a clear error when live but not configured", async () => {
    const original = env.textbee.apiKey;
    env.textbee.apiKey = "placeholder";
    await expect(
      textbee.sendSms({ toPhone: "+265991234567", body: "Hello", mode: "live" }),
    ).rejects.toThrow(/not configured/i);
    env.textbee.apiKey = original;
  });
});

describe("TextBee webhook signature (spec 8.5)", () => {
  const body = JSON.stringify({ webhookEvent: "MESSAGE_SENT", smsBatchId: "batch1" });

  it("accepts a correctly signed payload inside the time window", () => {
    expect(textbee.verifyWebhookSignature(Buffer.from(body), sign(body))).toBe(true);
  });

  it("rejects a wrong secret", () => {
    const header = sign(body, "some-other-secret");
    expect(textbee.verifyWebhookSignature(Buffer.from(body), header)).toBe(false);
  });

  it("rejects a stale timestamp", () => {
    const header = sign(body, SECRET, Math.floor(Date.now() / 1000) - 4000);
    expect(textbee.verifyWebhookSignature(Buffer.from(body), header)).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(textbee.verifyWebhookSignature(Buffer.from(body), undefined)).toBe(false);
  });
});

describe("TextBee webhook parsing", () => {
  it("maps MESSAGE_SENT / DELIVERED / FAILED to our statuses", () => {
    const base = { smsId: "s1", smsBatchId: "b1", idempotencyKey: "k1" };
    expect(
      textbee.parseWebhook({ ...base, webhookEvent: "MESSAGE_SENT", sentAt: "2026-11-28T10:00:00Z" }),
    ).toMatchObject({ type: "STATUS", status: "SENT" });
    expect(
      textbee.parseWebhook({ ...base, webhookEvent: "MESSAGE_DELIVERED" }),
    ).toMatchObject({ type: "STATUS", status: "DELIVERED" });
    expect(
      textbee.parseWebhook({
        ...base,
        webhookEvent: "MESSAGE_FAILED",
        errorMessage: "No service",
      }),
    ).toMatchObject({ type: "STATUS", status: "FAILED", error: "No service" });
  });

  it("never moves a message backwards", () => {
    expect(textbee.canApplyStatus("QUEUED", "SENT")).toBe(true);
    expect(textbee.canApplyStatus("SENT", "DELIVERED")).toBe(true);
    expect(textbee.canApplyStatus("DELIVERED", "SENT")).toBe(false);
    expect(textbee.canApplyStatus("DELIVERED", "FAILED")).toBe(false);
    expect(textbee.canApplyStatus("SENT", "FAILED")).toBe(true);
    expect(textbee.canApplyStatus("FAILED", "SENT")).toBe(false);
    expect(textbee.canApplyStatus("SENT", null)).toBe(false);
  });

  it("parses inbound messages with sender and body", () => {
    const parsed = textbee.parseWebhook({
      webhookEvent: "MESSAGE_RECEIVED",
      smsId: "s9",
      sender: "+265991234567",
      message: "YES please",
      idempotencyKey: "k9",
    });
    expect(parsed).toMatchObject({
      type: "INBOUND",
      from: "+265991234567",
      body: "YES please",
    });
  });
});

describe("Sender worker rules (spec 8.5 / 8.6)", () => {
  // Africa/Blantyre is UTC+2, no DST.
  it("blocks sends between 19:00 and 07:00", () => {
    expect(inQuietHours(new Date("2026-11-28T17:30:00Z"), "Africa/Blantyre")).toBe(true); // 19:30
    expect(inQuietHours(new Date("2026-11-28T04:00:00Z"), "Africa/Blantyre")).toBe(true); // 06:00
    expect(inQuietHours(new Date("2026-11-28T05:00:00Z"), "Africa/Blantyre")).toBe(false); // 07:00
    expect(inQuietHours(new Date("2026-11-28T10:00:00Z"), "Africa/Blantyre")).toBe(false); // 12:00
    expect(inQuietHours(new Date("2026-11-28T16:59:00Z"), "Africa/Blantyre")).toBe(false); // 18:59
  });

  it("uses the spec retry ladder: 5m, 30m, 2h, 6h then FAILED", () => {
    expect(RETRY_DELAYS_MIN).toEqual([5, 30, 120, 360]);
    expect(MAX_ATTEMPTS).toBe(5);
  });
});
