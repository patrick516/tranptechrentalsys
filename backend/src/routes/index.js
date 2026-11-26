const express = require("express");
const authRoutes = require("./auth");
const usersRoutes = require("./users");
const customersRoutes = require("./customers");
const stockRoutes = require("./stock");
const bookingsRoutes = require("./bookings");
const paymentsRoutes = require("./payments");
const ledgerRoutes = require("./ledger");
const promisesRoutes = require("./promises");
const interactionsRoutes = require("./interactions");
const documentsRoutes = require("./documents");
const filesRoutes = require("./files");
const reportsRoutes = require("./reports");
const dashboardRoutes = require("./dashboard");
const messagesRoutes = require("./messages");
const settingsRoutes = require("./settings");
const exportsRoutes = require("./exports");
const auditRoutes = require("./audit");
const webhooksRoutes = require("./webhooks");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "tranptech-chair-rental-api" });
});

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/customers", customersRoutes);
router.use("/stock", stockRoutes);
router.use("/bookings", bookingsRoutes);
router.use("/payments", paymentsRoutes);
router.use("/ledger", ledgerRoutes);
router.use("/promises", promisesRoutes);
router.use("/interactions", interactionsRoutes);
router.use("/documents", documentsRoutes);
router.use("/files", filesRoutes);
router.use("/reports", reportsRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/messages", messagesRoutes);
router.use("/settings", settingsRoutes);
router.use("/exports", exportsRoutes);
router.use("/audit", auditRoutes);
router.use("/webhooks", webhooksRoutes);

module.exports = router;
