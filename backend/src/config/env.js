// Loads and validates environment variables from Appendix D
require("dotenv").config();

const isProd = process.env.NODE_ENV === "production";

const requiredInProd = [
  "MONGODB_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "ID_ENCRYPTION_KEY",
  "JOBS_SECRET",
  "CORS_ORIGINS",
];

if (isProd) {
  for (const key of requiredInProd) {
    const val = process.env[key];
    if (
      !val ||
      val.startsWith("replace_with_") ||
      val.startsWith("placeholder_")
    ) {
      throw new Error(`Missing or default production secret for ${key}`);
    }
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd,
  port: Number(process.env.PORT || 5000),
  tz: process.env.TZ || "Africa/Blantyre",
  appEnv: process.env.APP_ENV || "dev",

  mongoUri: process.env.MONGODB_URI || "",

  jwtAccessSecret:
    process.env.JWT_ACCESS_SECRET || "dev_access_secret_change_me",
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET || "dev_refresh_secret_change_me",
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || "7d",

  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  idEncryptionKey: process.env.ID_ENCRYPTION_KEY || "",

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },

  // Placeholders until TextBee SIMs & devices are registered
  textbee: {
    apiKey: process.env.TEXTBEE_API_KEY || "",
    deviceAirtel: process.env.TEXTBEE_DEVICE_AIRTEL || "",
    deviceTnm: process.env.TEXTBEE_DEVICE_TNM || "",
    senderAirtel: process.env.TEXTBEE_SENDER_AIRTEL || "+265995049331",
    senderTnm: process.env.TEXTBEE_SENDER_TNM || "+265882781930",
    webhookSecret: process.env.TEXTBEE_WEBHOOK_SECRET || "",
    smsMode: process.env.SMS_MODE || "log", // 'live' or 'log'
    dailyCap: Number(process.env.SMS_DAILY_CAP || 100),
  },

  // Placeholders until new SIM & Meta Business portfolio are verified
  whatsapp: {
    apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
    appSecret: process.env.WHATSAPP_APP_SECRET || "",
  },

  jobsSecret: process.env.JOBS_SECRET || "dev_jobs_secret",
};

module.exports = env;
