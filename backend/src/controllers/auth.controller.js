// Thin HTTP handlers for /api/v1/auth endpoints
const env = require("../config/env");
const authService = require("../services/auth.service");

const REFRESH_COOKIE_NAME = "tp_refresh_token";

function setRefreshCookie(res, token, expiresAt) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd && !env.cookieDomain ? "none" : "lax",
    domain: env.cookieDomain,
    expires: expiresAt,
    path: "/api/v1/auth",
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd && !env.cookieDomain ? "none" : "lax",
    domain: env.cookieDomain,
    path: "/api/v1/auth",
  });
}

async function handleLogin(req, res, next) {
  try {
    const { user, accessToken, refreshToken, refreshExpiresAt } =
      await authService.login(req.body, req);
    setRefreshCookie(res, refreshToken, refreshExpiresAt);
    return res.status(200).json({
      data: {
        accessToken,
        user,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function handleRefresh(req, res, next) {
  try {
    const rawToken =
      req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    const { user, accessToken, refreshToken, refreshExpiresAt } =
      await authService.refreshSession(rawToken, req);
    setRefreshCookie(res, refreshToken, refreshExpiresAt);
    return res.status(200).json({
      data: {
        accessToken,
        user,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function handleLogout(req, res, next) {
  try {
    const rawToken =
      req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    await authService.logout(rawToken, req);
    clearRefreshCookie(res);
    return res.status(200).json({ data: { loggedOut: true } });
  } catch (err) {
    return next(err);
  }
}

async function handleMe(req, res) {
  return res.status(200).json({ data: { user: req.user } });
}

async function handleChangePassword(req, res, next) {
  try {
    await authService.changePassword(req.user._id, req.body, req);
    clearRefreshCookie(res);
    return res.status(200).json({ data: { changed: true } });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  REFRESH_COOKIE_NAME,
  handleLogin,
  handleRefresh,
  handleLogout,
  handleMe,
  handleChangePassword,
};
