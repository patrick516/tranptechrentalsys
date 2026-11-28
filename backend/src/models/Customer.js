const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, default: "", trim: true },
    phone: { type: String, required: true, trim: true }, // Normalised +265XXXXXXXXX
    network: {
      type: String,
      enum: ["AIRTEL", "TNM", "OTHER"],
      default: "OTHER",
    },
    email: { type: String, default: "", lowercase: true, trim: true },
    isPrimary: { type: Boolean, default: false },
    authorisesPayments: { type: Boolean, default: false },
    smsOptOut: { type: Boolean, default: false },
    idType: { type: String, default: "", trim: true },
    idNumberEncrypted: { type: String, default: null },
    whatsappOptIn: { type: Boolean, default: false },
    whatsappOptInAt: { type: Date, default: null },
    idFrontDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },
    idBackDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },
    notes: { type: String, default: "", trim: true },
  },
  { _id: true },
);

const customerSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true }, // e.g. C-0012
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["SCHOOL", "CHURCH", "INDIVIDUAL", "BUSINESS", "OTHER"],
      default: "OTHER",
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "WATCHLIST", "BLOCKED"],
      default: "ACTIVE",
      required: true,
    },
    area: { type: String, default: "", trim: true },
    distanceNote: { type: String, default: "", trim: true },
    contacts: {
      type: [contactSchema],
      validate: [
        (arr) => Array.isArray(arr) && arr.length > 0,
        "At least one contact is required",
      ],
    },
    formAcceptedAt: { type: Date, default: null },
    depositRequired: { type: Boolean, default: false },
    notes: { type: String, default: "", trim: true },
    archivedAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// Indexes per Section 6.13
customerSchema.index({ name: "text" });
customerSchema.index({ "contacts.phone": 1 });
customerSchema.index({ status: 1 });

module.exports = mongoose.model("Customer", customerSchema);
