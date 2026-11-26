function renderSmsTemplate(templateKey, vars = {}) {
  if (templateKey === "BALANCE_DUE") {
    return `TranpTech: Balance due is MK ${Number(vars.balance || 0).toLocaleString("en-US")}. Thank you.`;
  }
  return String(vars.body || "").slice(0, 320);
}

module.exports = { renderSmsTemplate };
