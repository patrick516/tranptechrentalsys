// Messaging channel router for WhatsApp and SMS
const { normalizePhone, detectNetwork } = require("../../utils/phone");

function prepareRecipient(contact, phonePrefixes = null) {
  const normalizedPhone = normalizePhone(contact?.phone || "");
  const network = detectNetwork(
    normalizedPhone,
    phonePrefixes,
    contact?.network || null,
  );
  return { normalizedPhone, network };
}

module.exports = { prepareRecipient };
