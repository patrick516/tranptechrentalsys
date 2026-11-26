const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");
const { AppError } = require("./errors");

async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
    }

    const token = authHeader.slice(7).trim();
    const payload = jwt.verify(token, env.jwtAccessSecret);

    // Check DB on each request so disabling a user takes immediate effect (Test S-05)
    const user = await User.findById(payload.sub);
    if (!user || user.status !== "ACTIVE") {
      return next(
        new AppError("Account is inactive or not found", 401, "UNAUTHORIZED"),
      );
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(
      new AppError("Invalid or expired access token", 401, "UNAUTHORIZED"),
    );
  }
}

module.exports = { requireAuth };
