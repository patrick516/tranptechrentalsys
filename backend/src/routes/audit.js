const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const AuditLog = require("../models/AuditLog");

const router = express.Router();

router.use(requireAuth);

router.get("/", requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.entityType) filter.entityType = req.query.entityType;
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.status(200).json({ data: logs });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
