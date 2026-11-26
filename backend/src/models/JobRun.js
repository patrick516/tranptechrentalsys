const mongoose = require("mongoose");

const jobRunSchema = new mongoose.Schema(
  {
    jobName: { type: String, required: true, index: true },
    businessDate: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["RUNNING", "COMPLETED", "FAILED"],
      default: "RUNNING",
    },
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
    error: { type: String, default: "" },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

jobRunSchema.index({ jobName: 1, businessDate: 1 });

module.exports = mongoose.model("JobRun", jobRunSchema);
