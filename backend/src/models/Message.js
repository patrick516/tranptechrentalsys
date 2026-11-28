const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null, // null for an inbound SMS from an unknown number
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    contactName: { type: String, default: "", trim: true },
    direction: { type: String, enum: ["OUT", "IN"], default: "OUT" },
    scheduledAt: { type: Date, default: null },
    senderNumber: { type: String, default: null },
    deviceId: { type: String, default: null },
    fallbackUsed: { type: Boolean, default: false },
    toPhone: { type: String, required: true, trim: true },
    network: {
      type: String,
      enum: ["AIRTEL", "TNM", "OTHER"],
      default: "OTHER",
    },
    channel: {
      type: String,
      enum: ["WHATSAPP", "SMS"],
      required: true,
    },
    templateKey: { type: String, default: "", trim: true },
    body: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "QUEUED",
        "SENDING",
        "SENT",
        "DELIVERED",
        "READ",
        "FAILED",
        "CANCELLED",
        "RECEIVED",
      ],
      default: "QUEUED",
      required: true,
    },
    providerMessageId: { type: String, default: null, index: true }, // TextBee smsBatchId / WhatsApp message id
    providerSmsId: { type: String, default: null }, // TextBee per-recipient id from webhook events
    webhookIdempotencyKey: { type: String, default: null },
    error: { type: String, default: "" },
    attempts: { type: Number, default: 0 },
    nextRetryAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// Indexes per Section 6.19
messageSchema.index({ status: 1, nextRetryAt: 1 });
messageSchema.index({ customerId: 1, createdAt: -1 });
// Webhook dedupe: TextBee retries a delivery with the same key (spec 8.5).
// partialFilterExpression keeps the null default out of the unique index.
messageSchema.index(
  { webhookIdempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { webhookIdempotencyKey: { $type: "string" } },
  },
);

module.exports = mongoose.model("Message", messageSchema);
