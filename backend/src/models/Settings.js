const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true },
    businessName: {
      type: String,
      default: "TranpTech Chair Rentals",
      trim: true,
    },
    ratePerChairPerDay: { type: Number, default: 400 },
    lateFeePerDay: { type: Number, default: 2000 },
    graceDays: { type: Number, default: 0 },
    depositRequiredDefault: { type: Boolean, default: false },
    smsDailyCap: { type: Number, default: 100 },
    smsMode: { type: String, enum: ["live", "log"], default: "log" },
    phonePrefixes: {
      AIRTEL: { type: [String], default: ["+26599"] },
      TNM: { type: [String], default: ["+26588"] },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Settings", settingsSchema);
