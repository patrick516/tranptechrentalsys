const { getDashboardSummary } = require("../services/dashboard.service");

async function summary(req, res, next) {
  try {
    const data = await getDashboardSummary(req.query?.date || null);
    return res.status(200).json({ data });
  } catch (err) {
    return next(err);
  }
}

module.exports = { summary };
