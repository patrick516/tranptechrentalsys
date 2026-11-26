const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },
    kind: {
      type: String,
      enum: [
        "NATIONAL_ID",
        "CONTRACT",
        "PAYMENT_PROOF",
        "REPORT_EXPORT",
        "OTHER",
      ],
      required: true,
    },
    folder: { type: String, default: "general", trim: true },
    title: { type: String, required: true, trim: true },
    storageProvider: {
      type: String,
      enum: ["CLOUDINARY", "LOCAL"],
      default: "CLOUDINARY",
    },
    publicId: { type: String, default: "" },
    url: { type: String, required: true },
    mimeType: { type: String, default: "application/octet-stream" },
    sizeBytes: { type: Number, default: 0 },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Document", documentSchema);
