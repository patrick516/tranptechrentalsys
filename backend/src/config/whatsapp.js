// WhatsApp Business Cloud API configuration.
// Values come from .env (placeholders in .env.example). Nothing is sent until
// WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID hold real values.
const env = require("./env");

const cfg = env.whatsapp;

const MODE = process.env.WHATSAPP_MODE || "auto"; // 'auto' | 'link' | 'off'

function isConfigured() {
  return Boolean(cfg.accessToken && cfg.phoneNumberId);
}

function isEnabled() {
  return MODE !== "off" && isConfigured();
}

module.exports = {
  ...cfg,
  mode: MODE,
  isConfigured,
  isEnabled,
};
