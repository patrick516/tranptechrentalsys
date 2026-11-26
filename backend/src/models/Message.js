const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    contactName: { type: String, default: "", trim: true },
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
      enum: ["QUEUED", "SENT", "DELIVERED", "READ", "FAILED", "CANCELLED"],
      default: "QUEUED",
      required: true,
    },
    providerMessageId: { type: String, default: null, index: true },
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

module.exports = mongoose.model("Message", messageSchema);
