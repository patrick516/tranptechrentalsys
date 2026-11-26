function buildStatementText({ title, subtitle = "", lines = [] }) {
  const header = [title, subtitle, "=".repeat(48)].filter(Boolean).join("\n");
  const body = lines.map((line) => String(line)).join("\n");
  return `${header}\n${body}\n`;
}

module.exports = { buildStatementText };
