const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: String, default: null },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    at: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

auditLogSchema.index({ entityType: 1, entityId: 1, at: -1 });

const AuditLog =
  mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);

async function writeAuditLog(
  {
    userId = null,
    action,
    entityType,
    entityId = null,
    before = null,
    after = null,
    req = null,
  },
  session = null,
) {
  const entry = {
    userId,
    action,
    entityType,
    entityId: entityId ? String(entityId) : null,
    before,
    after,
    ip: req?.ip || "",
    userAgent: req?.get?.("user-agent") || "",
    at: new Date(),
  };

  if (session) {
    const [created] = await AuditLog.create([entry], { session });
    return created;
  }
  return AuditLog.create(entry);
}

module.exports = {
  AuditLog,
  writeAuditLog,
};
