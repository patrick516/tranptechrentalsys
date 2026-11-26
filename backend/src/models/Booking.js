const mongoose = require("mongoose");

const extensionSchema = new mongoose.Schema(
  {
    requestedDate: { type: String, required: true },
    days: { type: Number, required: true },
    newEndDate: { type: String, required: true },
    chargeTotal: { type: Number, required: true },
    notes: { type: String, default: "", trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    status: {
      type: String,
      enum: ["RESERVED", "OUT", "RETURNED", "CANCELLED"],
      default: "RESERVED",
      required: true,
    },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    qty: { type: Number, required: true },
    qtyOut: { type: Number, default: 0 },
    qtyReturned: { type: Number, default: 0 },
    qtyLost: { type: Number, default: 0 },
    qtyDamaged: { type: Number, default: 0 },
    ratePerChairPerDay: { type: Number, required: true },
    lateFeePerDay: { type: Number, default: 2000 },
    graceDays: { type: Number, default: 0 },
    depositHeld: { type: Number, default: 0 },
    depositReturned: { type: Number, default: 0 },
    pickupDate: { type: String, default: null },
    returnedDate: { type: String, default: null },
    venue: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    extensions: { type: [extensionSchema], default: [] },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// Indexes per Section 6.15
bookingSchema.index({ customerId: 1, status: 1 });
bookingSchema.index({ status: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ endDate: 1, status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
