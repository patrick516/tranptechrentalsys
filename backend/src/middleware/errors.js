// Central error classes and Express error handler (Section 10.1 & 12.14)
const env = require("../config/env");

class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details = [],
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function notFoundHandler(req, _res, next) {
  next(
    new AppError(
      `Route not found: ${req.method} ${req.originalUrl}`,
      404,
      "NOT_FOUND",
    ),
  );
}

function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code =
    err.code || (statusCode === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR");

  // Never leak stack traces or internal errors in production (Test S-12)
  const message =
    statusCode === 500 && env.isProd
      ? "Internal server error"
      : err.message || "Server error";

  const payload = {
    error: {
      code,
      message,
      ...(Array.isArray(err.details) && err.details.length > 0
        ? { details: err.details }
        : {}),
    },
  };

  if (!env.isProd && statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json(payload);
}

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler,
};
