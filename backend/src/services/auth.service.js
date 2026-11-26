// Handles login with lockout, access token issuance, rotating refresh tokens, and logout
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const argon2 = require("argon2");
const env = require("../config/env");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { AppError } = require("../middleware/errors");
const { writeAuditLog } = require("../utils/audit");

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseDurationMs(ttlStr, fallbackMs) {
  const match = /^(\d+)([smhd])$/.exec(String(ttlStr || "").trim());
  if (!match) return fallbackMs;
  const num = Number(match[1]);
  const unit = match[2];
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * mult[unit];
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role },
    env.jwtAccessSecret,
    {
      expiresIn: env.accessTokenTtl,
    },
  );
}

async function issueRefreshToken(user, familyId, req) {
  const rawToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = sha256(rawToken);
  const ttlMs = parseDurationMs(env.refreshTokenTtl, 7 * 86400000);
  const expiresAt = new Date(Date.now() + ttlMs);

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    familyId: familyId || crypto.randomUUID(),
    expiresAt,
    userAgent: req?.get?.("user-agent") || "",
    ip: req?.ip || "",
  });

  return { rawToken, expiresAt };
}

async function login({ email, password }, req) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  // Use identical error wording for unknown email or invalid credentials (Section 11.3 & 12.2)
  const invalidMsg = "Invalid email or password";
  if (!user) {
    await writeAuditLog({
      action: "LOGIN_FAILED",
      entityType: "USER",
      after: { email: normalizedEmail },
      req,
    });
    throw new AppError(invalidMsg, 401, "INVALID_CREDENTIALS");
  }

  if (user.status !== "ACTIVE") {
    await writeAuditLog({
      userId: user._id,
      action: "LOGIN_BLOCKED_DISABLED",
      entityType: "USER",
      entityId: user._id,
      req,
    });
    throw new AppError("Account is disabled", 403, "ACCOUNT_DISABLED");
  }

  const now = new Date();
  if (user.failedLogins?.lockedUntil && user.failedLogins.lockedUntil > now) {
    throw new AppError(
      "Account locked due to repeated failed attempts. Try again in 15 minutes.",
      423,
      "ACCOUNT_LOCKED",
    );
  }

  const passwordOk = await argon2.verify(user.passwordHash, password);
  if (!passwordOk) {
    const withinWindow =
      user.failedLogins?.firstAt &&
      now.getTime() - user.failedLogins.firstAt.getTime() <= LOCKOUT_WINDOW_MS;
    const nextCount = withinWindow ? (user.failedLogins.count || 0) + 1 : 1;
    const firstAt = withinWindow ? user.failedLogins.firstAt : now;
    const lockedUntil =
      nextCount >= MAX_FAILED_ATTEMPTS
        ? new Date(now.getTime() + LOCKOUT_WINDOW_MS)
        : null;

    user.failedLogins = { count: nextCount, firstAt, lockedUntil };
    await user.save();

    await writeAuditLog({
      userId: user._id,
      action: "LOGIN_FAILED",
      entityType: "USER",
      entityId: user._id,
      after: { failedCount: nextCount, locked: Boolean(lockedUntil) },
      req,
    });

    if (lockedUntil) {
      throw new AppError(
        "Account locked due to repeated failed attempts. Try again in 15 minutes.",
        423,
        "ACCOUNT_LOCKED",
      );
    }
    throw new AppError(invalidMsg, 401, "INVALID_CREDENTIALS");
  }

  // Reset failed attempt counter on valid login
  user.failedLogins = { count: 0, firstAt: null, lockedUntil: null };
  user.lastLoginAt = now;
  await user.save();

  const accessToken = signAccessToken(user);
  const { rawToken: refreshToken, expiresAt } = await issueRefreshToken(
    user,
    crypto.randomUUID(),
    req,
  );

  await writeAuditLog({
    userId: user._id,
    action: "LOGIN_SUCCESS",
    entityType: "USER",
    entityId: user._id,
    req,
  });

  return { user, accessToken, refreshToken, refreshExpiresAt: expiresAt };
}

async function refreshSession(rawRefreshToken, req) {
  if (!rawRefreshToken) {
    throw new AppError("Refresh token missing", 401, "UNAUTHORIZED");
  }

  const tokenHash = sha256(rawRefreshToken);
  const stored = await RefreshToken.findOne({ tokenHash });

  if (!stored) {
    throw new AppError("Invalid refresh token", 401, "UNAUTHORIZED");
  }

  // Reuse of an already-rotated or revoked token revokes the entire token family (Test S-04)
  if (stored.revokedAt || stored.replacedByHash) {
    await RefreshToken.updateMany(
      { familyId: stored.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    await writeAuditLog({
      userId: stored.userId,
      action: "REFRESH_TOKEN_REUSE_DETECTED",
      entityType: "REFRESH_TOKEN",
      entityId: stored._id,
      after: { familyId: stored.familyId },
      req,
    });
    throw new AppError(
      "Refresh token reuse detected; session revoked",
      401,
      "TOKEN_REUSED",
    );
  }

  if (stored.expiresAt <= new Date()) {
    throw new AppError("Refresh token expired", 401, "UNAUTHORIZED");
  }

  const user = await User.findById(stored.userId);
  if (!user || user.status !== "ACTIVE") {
    throw new AppError("Account inactive", 401, "UNAUTHORIZED");
  }

  const nextAccessToken = signAccessToken(user);
  const {
    rawToken: nextRefreshToken,
    expiresAt,
    tokenHash: nextHash,
  } = await issueRefreshToken(user, stored.familyId, req);

  stored.revokedAt = new Date();
  stored.replacedByHash = nextHash;
  await stored.save();

  return {
    user,
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
    refreshExpiresAt: expiresAt,
  };
}

async function logout(rawRefreshToken, req) {
  if (!rawRefreshToken) return;
  const tokenHash = sha256(rawRefreshToken);
  const stored = await RefreshToken.findOne({ tokenHash });
  if (stored && !stored.revokedAt) {
    stored.revokedAt = new Date();
    await stored.save();
    await writeAuditLog({
      userId: stored.userId,
      action: "LOGOUT",
      entityType: "USER",
      entityId: stored.userId,
      req,
    });
  }
}

async function changePassword(userId, { currentPassword, newPassword }, req) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  const minLen = user.role === "ADMIN" ? 12 : 10;
  if (newPassword.length < minLen) {
    throw new AppError(
      `Password must be at least ${minLen} characters`,
      400,
      "VALIDATION_ERROR",
    );
  }

  const ok = await argon2.verify(user.passwordHash, currentPassword);
  if (!ok) {
    throw new AppError(
      "Current password is incorrect",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  user.passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await user.save();

  // Revoke existing refresh tokens after password change
  await RefreshToken.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  await writeAuditLog({
    userId: user._id,
    action: "PASSWORD_CHANGED",
    entityType: "USER",
    entityId: user._id,
    req,
  });
}

module.exports = {
  login,
  refreshSession,
  logout,
  changePassword,
};
