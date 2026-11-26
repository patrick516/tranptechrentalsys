// WhatsApp message templates for reminders and receipts
function renderWhatsAppTemplate(templateKey, vars = {}) {
  switch (templateKey) {
    case "PAYMENT_REMINDER":
      return `Hello ${vars.name || "Customer"}, friendly reminder from TranpTech regarding your chair rental balance of MK ${Number(vars.balance || 0).toLocaleString("en-US")}.`;
    case "RETURN_REMINDER":
      return `Hello ${vars.name || "Customer"}, reminder that ${vars.qty || ""} rented chairs for booking ${vars.code || ""} are due for return on ${vars.endDate || ""}.`;
    default:
      return String(vars.body || "");
  }
}

module.exports = { renderWhatsAppTemplate };
