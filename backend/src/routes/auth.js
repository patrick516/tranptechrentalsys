// backend/src/routes/auth.js
const express = require("express");
const { validate } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { loginRateLimiter } = require("../middleware/limits");
const {
  loginSchema,
  changePasswordSchema,
} = require("../validators/auth.validator");
const authController = require("../controllers/auth.controller");

const router = express.Router();

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
