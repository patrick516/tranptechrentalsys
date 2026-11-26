const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const { validate } = require("../middleware/validate");
const { dashboardQuerySchema } = require("../validators/dashboard.validator");
const dashboardController = require("../controllers/dashboard.controller");

const router = express.Router();

router.use(requireAuth);
router.get(
  "/summary",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  validate({ query: dashboardQuerySchema }),
  dashboardController.summary,
);

module.exports = router;
