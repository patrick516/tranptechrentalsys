const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["ADMIN", "STAFF", "VIEWER"],
      default: "VIEWER",
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "DISABLED"],
      default: "ACTIVE",
      required: true,
    },
    // Grants STAFF permission to view National ID images (Section 3.2 & 12.3)
    canViewIdImages: { type: Boolean, default: false },
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secretEncrypted: { type: String, default: null },
      recoveryCodesHashed: { type: [String], default: [] },
    },
    failedLogins: {
      count: { type: Number, default: 0 },
      firstAt: { type: Date, default: null },
      lockedUntil: { type: Date, default: null },
    },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.passwordHash;
    if (ret.twoFactor) {
      delete ret.twoFactor.secretEncrypted;
      delete ret.twoFactor.recoveryCodesHashed;
    }
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
