const mongoose = require("mongoose");

async function generateSequentialCode(
  Model,
  prefix,
  width = 4,
  session = null,
) {
  const query = Model.findOne({ code: new RegExp(`^${prefix}-\\d+$`) })
    .sort({ code: -1 })
    .select("code")
    .lean();

  if (session) query.session(session);
  const latest = await query;

  let nextNum = 1;
  if (latest?.code) {
    const parts = latest.code.split("-");
    const parsed = Number(parts[1]);
    if (Number.isInteger(parsed) && parsed >= 0) {
      nextNum = parsed + 1;
    }
  }

  return `${prefix}-${String(nextNum).padStart(width, "0")}`;
}

module.exports = { generateSequentialCode };
