// Internal scheduler (spec 4.4 / 8.5): one sender worker every minute and the
// daily ledger job at 00:05 Africa/Blantyre. Started from server.js only, so
// tests never trigger a run.
const cron = require("node-cron");
const env = require("./config/env");
const logger = require("./lib/logger");
const { processQueuedMessages } = require("./jobs/sender");
const { runDailyLedgerJob } = require("./jobs/dailyLedgerJob");

let started = false;
let senderRunning = false;
let ledgerRunning = false;

function startScheduler() {
  if (started || env.nodeEnv === "test") return false;
  started = true;

  // Sender worker: due messages only, so a run that finds nothing is cheap.
  cron.schedule(
    "* * * * *",
    async () => {
      if (senderRunning) return;
      senderRunning = true;
      try {
        await processQueuedMessages();
      } catch (err) {
        logger.error("Sender worker failed", { message: err.message });
      } finally {
        senderRunning = false;
      }
    },
    { timezone: env.tz },
  );

  // Daily ledger: overstay HIRE and past-due LATE_FEE for the business day.
  cron.schedule(
    "5 0 * * *",
    async () => {
      if (ledgerRunning) return;
      ledgerRunning = true;
      try {
        await runDailyLedgerJob();
        logger.info("Daily ledger job completed");
      } catch (err) {
        logger.error("Daily ledger job failed", { message: err.message });
      } finally {
        ledgerRunning = false;
      }
    },
    { timezone: env.tz },
  );

  logger.info("Scheduler started", { timezone: env.tz });
  return true;
}

module.exports = { startScheduler };
