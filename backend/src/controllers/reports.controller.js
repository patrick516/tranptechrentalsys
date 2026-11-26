const { getDebtorsList } = require("../services/reports.service");
const { runDailyLedgerJob } = require("../jobs/dailyLedgerJob");

async function debtors(req, res, next) {
  try {
    const minBalance =
      req.query.minBalance !== undefined ? Number(req.query.minBalance) : 1;
    const data = await getDebtorsList(minBalance);
    return res.status(200).json({ data });
  } catch (err) {
    return next(err);
  }
}

async function runDailyJob(req, res, next) {
  try {
    const result = await runDailyLedgerJob(req.body?.businessDate || null);
    return res.status(200).json({ data: result });
  } catch (err) {
    return next(err);
  }
}

module.exports = { debtors, runDailyJob };
