const mongoose = require("mongoose");

const promiseSchema = new mongoose.Schema(
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
    kind: {
      type: String,
      enum: ["PAYMENT", "RETURN"],
      required: true,
    },
    promisedDate: { type: String, required: true }, // Business date YYYY-MM-DD
    promisedAmount: { type: Number, default: null },
    status: {
      type: String,
      enum: ["PENDING", "KEPT", "BROKEN", "CANCELLED"],
      default: "PENDING",
      required: true,
    },
    notes: { type: String, default: "", trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

promiseSchema.index({ status: 1, promisedDate: 1 });
promiseSchema.index({ customerId: 1 });

module.exports = mongoose.model("Promise", promiseSchema);
