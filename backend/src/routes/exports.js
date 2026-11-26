const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireRoles } = require("../middleware/roles");
const Customer = require("../models/Customer");
const LedgerEntry = require("../models/LedgerEntry");
const Payment = require("../models/Payment");
const { calcBalance } = require("../services/ledger.calc");
const {
  buildCustomerStatementContent,
} = require("../services/exports/content");
const { AppError } = require("../middleware/errors");

const router = express.Router();

router.use(requireAuth);

router.get(
  "/customer/:customerId/statement",
  requireRoles("ADMIN", "STAFF", "VIEWER"),
  async (req, res, next) => {
    try {
      const customer = await Customer.findById(req.params.customerId).lean();
      if (!customer) {
        return next(new AppError("Customer not found", 404, "NOT_FOUND"));
      }
      const [entries, payments] = await Promise.all([
        LedgerEntry.find({ customerId: customer._id }).lean(),
        Payment.find({ customerId: customer._id }).lean(),
      ]);
      const balance = calcBalance(entries, payments);
      const statementText = buildCustomerStatementContent(
        customer,
        balance,
        entries,
        payments,
      );
      return res
        .status(200)
        .json({ data: { customer, balance, statementText } });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
