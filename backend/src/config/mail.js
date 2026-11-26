module.exports = {
  enabled: process.env.MAIL_ENABLED === "true",
  from: process.env.MAIL_FROM || "no-reply@tranptech.mw",
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT || 587),
};
