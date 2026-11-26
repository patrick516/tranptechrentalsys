const { buildStatementText } = require("../../lib/pdf");

function generateStatementPdfBuffer(payload) {
  const text = buildStatementText(payload);
  return Buffer.from(text, "utf8");
}

module.exports = { generateStatementPdfBuffer };
