function buildDocxSummaryText({ title = "TranpTech Report", rows = [] }) {
  const header = `${title}\n${"-".repeat(40)}`;
  const body = rows
    .map((r) => (typeof r === "string" ? r : JSON.stringify(r)))
    .join("\n");
  return `${header}\n${body}\n`;
}

module.exports = { buildDocxSummaryText };
