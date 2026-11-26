const logger = require("./logger");

async function sendMail({ to, subject, text }) {
  logger.info("Mailer invoked (log mode)", {
    to,
    subject,
    length: text ? text.length : 0,
  });
  return { queued: true, mode: "log" };
}

module.exports = { sendMail };
