const mongoose = require("mongoose");

const ledgerEntrySchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "HIRE",
        "LATE_FEE",
        "DAMAGE_FEE",
        "LOSS_FEE",
        "DEPOSIT",
        "ADJUSTMENT",
      ],
      required: true,
    },
    date: { type: String, required: true }, // Business date YYYY-MM-DD
    dueDate: { type: String, required: true }, // Business date YYYY-MM-DD
    qty: { type: Number, default: null },
    unitAmount: { type: Number, default: null },
    amount: { type: Number, required: true }, // Whole MK; negative allowed on ADJUSTMENT/DEPOSIT return
    description: { type: String, default: "", trim: true },
    source: {
      type: String,
      enum: ["SYSTEM", "MANUAL", "RETURN"],
      default: "MANUAL",
    },
    idempotencyKey: { type: String, default: null }, // Unique sparse index prevents duplicate daily runs (G-11)
    reason: { type: String, default: "", trim: true },
    voidedAt: { type: Date, default: null },
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

// Indexes per Section 6.16
ledgerEntrySchema.index({ customerId: 1, date: 1 });
ledgerEntrySchema.index({ bookingId: 1, date: 1 });
ledgerEntrySchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("LedgerEntry", ledgerEntrySchema);
