// TextBee webhook (spec 8.5): signed delivery status updates and inbound SMS.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createRequire } from "module";
import crypto from "crypto";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

const require = createRequire(import.meta.url);
const mongoose = require("mongoose");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test_access_secret_key_for_vitest";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_key_for_vitest";
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.TEXTBEE_WEBHOOK_SECRET = "test_webhook_secret_value_123456";

const app = require("../../src/app");
const Message = require("../../src/models/Message");
const Customer = require("../../src/models/Customer");

const SECRET = process.env.TEXTBEE_WEBHOOK_SECRET;
let mongoServer;

function headerFor(body, t = Math.floor(Date.now() / 1000)) {
  const v1 = crypto.createHmac("sha256", SECRET).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

describe("TextBee webhook", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await Message.deleteMany({});
    await Customer.deleteMany({});
  });

  it("WEB-01: rejects an unsigned or wrongly signed payload", async () => {
    const body = JSON.stringify({ webhookEvent: "MESSAGE_SENT", smsBatchId: "b1" });

    const unsigned = await request(app)
      .post("/api/v1/webhooks/textbee")
      .set("Content-Type", "application/json")
      .send(body);
    expect(unsigned.status).toBe(401);

    const wrong = await request(app)
      .post("/api/v1/webhooks/textbee")
      .set("Content-Type", "application/json")
      .set("X-Textbee-Signature", headerFor(body).replace(/v1=.*/, "v1=deadbeef"))
      .send(body);
    expect(wrong.status).toBe(401);
  });

  it("WEB-02: moves a queued message to DELIVERED by smsBatchId", async () => {
    const msg = await Message.create({
      customerId: new mongoose.Types.ObjectId(),
      toPhone: "+265991234567",
      channel: "SMS",
      body: "Balance due",
      status: "SENT",
      providerMessageId: "batch-123",
    });

    const body = JSON.stringify({
      webhookEvent: "MESSAGE_DELIVERED",
      smsId: "sms-1",
      smsBatchId: "batch-123",
      idempotencyKey: "deliv-1",
      recipient: "+265991234567",
    });

    const res = await request(app)
      .post("/api/v1/webhooks/textbee")
      .set("Content-Type", "application/json")
      .set("X-Textbee-Signature", headerFor(body))
      .send(body);

    expect(res.status).toBe(200);
    const updated = await Message.findById(msg._id);
    expect(updated.status).toBe("DELIVERED");
    expect(updated.providerSmsId).toBe("sms-1");
  });

  it("WEB-03: a retried delivery with the same key is processed once", async () => {
    const msg = await Message.create({
      customerId: new mongoose.Types.ObjectId(),
      toPhone: "+265991234567",
      channel: "SMS",
      body: "Balance due",
      status: "SENT",
      providerMessageId: "batch-222",
    });

    const body = JSON.stringify({
      webhookEvent: "MESSAGE_FAILED",
      smsId: "sms-2",
      smsBatchId: "batch-222",
      idempotencyKey: "fail-1",
      errorMessage: "No service",
    });

    for (let i = 0; i < 2; i += 1) {
      const res = await request(app)
        .post("/api/v1/webhooks/textbee")
        .set("Content-Type", "application/json")
        .set("X-Textbee-Signature", headerFor(body))
        .send(body);
      expect(res.status).toBe(200);
    }

    const updated = await Message.findById(msg._id);
    expect(updated.status).toBe("FAILED");
    expect(updated.error).toBe("No service");
  });

  it("WEB-04: never moves a message backwards", async () => {
    const msg = await Message.create({
      customerId: new mongoose.Types.ObjectId(),
      toPhone: "+265991234567",
      channel: "SMS",
      body: "Balance due",
      status: "DELIVERED",
      providerMessageId: "batch-333",
    });

    const body = JSON.stringify({
      webhookEvent: "MESSAGE_SENT",
      smsId: "sms-3",
      smsBatchId: "batch-333",
      idempotencyKey: "sent-late-1",
    });

    await request(app)
      .post("/api/v1/webhooks/textbee")
      .set("Content-Type", "application/json")
      .set("X-Textbee-Signature", headerFor(body))
      .send(body);

    const updated = await Message.findById(msg._id);
    expect(updated.status).toBe("DELIVERED");
  });

  it("WEB-05: stores an inbound SMS matched to the customer by phone", async () => {
    const customer = await Customer.create({
      code: "C001",
      name: "Test School",
      contacts: [
        { name: "Owner", phone: "0991234567", isPrimary: true },
      ],
    });

    const body = JSON.stringify({
      webhookEvent: "MESSAGE_RECEIVED",
      smsId: "sms-in-1",
      sender: "+265991234567",
      message: "YES, please confirm",
      idempotencyKey: "in-1",
      receivedAt: "2026-11-28T09:14:03.000Z",
    });

    const res = await request(app)
      .post("/api/v1/webhooks/textbee")
      .set("Content-Type", "application/json")
      .set("X-Textbee-Signature", headerFor(body))
      .send(body);
    expect(res.status).toBe(200);

    const stored = await Message.findOne({ direction: "IN" });
    expect(stored).toBeTruthy();
    expect(stored.status).toBe("RECEIVED");
    expect(stored.toPhone).toBe("+265991234567");
    expect(String(stored.customerId)).toBe(String(customer._id));
    expect(stored.body).toBe("YES, please confirm");

    // the same delivery again must not create a second row
    await request(app)
      .post("/api/v1/webhooks/textbee")
      .set("Content-Type", "application/json")
      .set("X-Textbee-Signature", headerFor(body))
      .send(body);
    expect(await Message.countDocuments({ direction: "IN" })).toBe(1);
  });
});
