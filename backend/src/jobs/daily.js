const { runDailyLedgerJob } = require("./dailyLedgerJob");

async function runDaily(businessDate = null) {
  return runDailyLedgerJob(businessDate);
}

module.exports = { runDaily };
