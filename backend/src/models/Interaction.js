const mongoose = require("mongoose");

const interactionSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    channel: {
      type: String,
      enum: ["PHONE", "WHATSAPP", "SMS", "VISIT", "OTHER"],
      required: true,
    },
    summary: { type: String, required: true, trim: true },
    followUpDate: { type: String, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Interaction", interactionSchema);
