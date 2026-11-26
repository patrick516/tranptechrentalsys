function generateFilingSummaryBuffer(payload) {
  return Buffer.from(JSON.stringify(payload, null, 2), "utf8");
}

module.exports = { generateFilingSummaryBuffer };
