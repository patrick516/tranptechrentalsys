// backend/src/routes/auth.js
const express = require("express");
const { validate } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { loginRateLimiter } = require("../middleware/limits");
const {
  loginSchema,
  registerSchema,
  changePasswordSchema,
} = require("../validators/auth.validator");
const authController = require("../controllers/auth.controller");

const router = express.Router();

// Public: tells the portal whether the very first account still has to be
// created (no users in the database yet).
router.get("/setup", authController.handleSetupStatus);

// Public: available only while the user collection is empty. Once one account
// exists this returns 409 and every later account is added by an administrator.
router.post(
  "/register",
  loginRateLimiter,
  validate({ body: registerSchema }),
  authController.handleRegister,
);

router.post(
  "/login",
  loginRateLimiter,
  validate({ body: loginSchema }),
  authController.handleLogin,
);
router.post("/refresh", authController.handleRefresh);
router.post("/logout", authController.handleLogout);
router.get("/me", requireAuth, authController.handleMe);
router.post(
  "/change-password",
  requireAuth,
  validate({ body: changePasswordSchema }),
  authController.handleChangePassword,
);

module.exports = router;
