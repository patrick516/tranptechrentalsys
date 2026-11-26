// Configures Express app with security headers, CORS allowlist, sanitisation, and /api/v1 routes
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const env = require("./config/env");
const { sanitizeRequest } = require("./middleware/validate");
const { requireAuth } = require("./middleware/auth");
const { requireRoles } = require("./middleware/roles");
const { notFoundHandler, errorHandler } = require("./middleware/errors");
const apiRoutes = require("./routes");

function createApp({
  enableTestRoutes = process.env.NODE_ENV === "test",
} = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  // Strict CORS allowlist
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin not allowed by CORS"));
      },
      credentials: true,
    }),
  );

  // Global rate limit
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Capture rawBody for webhook signature verification
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(cookieParser());

  // Prevent NoSQL operator injection
  app.use(sanitizeRequest);

  // Prevent caching of sensitive API payloads
  app.use("/api/v1", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  app.use("/api/v1", apiRoutes);

  // Test-only route used for RBAC verification (S-01) when NODE_ENV=test
  if (enableTestRoutes) {
    app.get(
      "/api/v1/_test-admin-only",
      requireAuth,
      requireRoles("ADMIN"),
      (_req, res) => {
        res.status(200).json({ data: { ok: true } });
      },
    );
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();
app.createApp = createApp;

module.exports = app;
