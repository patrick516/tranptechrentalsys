// Rate limiters for sensitive routes such as login
const rateLimit = require("express-rate-limit");

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many login attempts. Please try again in 15 minutes.",
    },
  },
});

module.exports = { loginRateLimiter };
