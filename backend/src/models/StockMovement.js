const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    type: {
      type: String,
      enum: ["PURCHASE", "LOST", "DAMAGED", "REPAIRED", "FOUND", "WRITE_OFF"],
      required: true,
    },
    qty: {
      type: Number,
      required: true,
      validate: {
        validator: (v) => Number.isInteger(v) && v > 0,
        message: "qty must be a positive integer",
      },
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    note: { type: String, default: "", trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stockMovementSchema.index({ date: 1 });
stockMovementSchema.index({ bookingId: 1 });

module.exports = mongoose.model("StockMovement", stockMovementSchema);
