const logger = require("../../lib/logger");

async function sendSms({ toPhone, body, mode = "log" }) {
  if (mode === "live") {
    logger.info("Live SMS gateway dispatch", { toPhone, length: body.length });
    return { status: "QUEUED" };
  }
  logger.info("SMS logged in log mode", { toPhone, body });
  return { status: "SENT" };
}

module.exports = { sendSms };
