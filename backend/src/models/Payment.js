const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
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
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: (v) => Number.isInteger(v) && v > 0,
        message: "Payment amount must be a positive integer in kwacha",
      },
    },
    paidDate: { type: String, required: true },
    method: {
      type: String,
      enum: ["AIRTEL_MONEY", "MPAMBA", "CASH", "BANK", "OTHER"],
      required: true,
    },
    reference: { type: String, default: "", trim: true },
    payerName: { type: String, default: "", trim: true },
    payerPhone: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["CONFIRMED", "VOID"],
      default: "CONFIRMED",
      required: true,
    },
    voidReason: { type: String, default: "", trim: true },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// Indexes per Section 6.17
paymentSchema.index({ customerId: 1, paidDate: 1 });
paymentSchema.index({ paidDate: 1, status: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
