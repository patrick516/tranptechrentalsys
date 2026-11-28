// Channel router: picks WhatsApp or SMS for one contact, using the same
// recipient preparation and the same queue for both, so there is only one
// set of retry rules.
const { normalizePhone, detectNetwork } = require("../../utils/phone");
const { canSendChannel } = require("./optin");
const whatsapp = require("../whatsapp/client");

function prepareRecipient(contact, phonePrefixes = null) {
  const normalizedPhone = normalizePhone(contact?.phone || "");
  const network = detectNetwork(
    normalizedPhone,
    phonePrefixes,
    contact?.network || null,
  );
  return { normalizedPhone, network };
}

// Returns { channel, reason } — reason explains the choice for the audit log.
function chooseChannel({ contact, requested = null, whatsappMode = "auto" }) {
  if (whatsappMode === "off" || !whatsapp.isEnabled()) {
    return { channel: "SMS", reason: "WHATSAPP_NOT_AVAILABLE" };
  }

  if (requested === "SMS") {
    const check = canSendChannel(contact, "SMS");
    return check.allowed
      ? { channel: "SMS", reason: "REQUESTED" }
      : { channel: null, reason: check.reason };
  }

  const check = canSendChannel(contact, "WHATSAPP");
  if (check.allowed) {
    return { channel: "WHATSAPP", reason: "OPTED_IN" };
  }

  const sms = canSendChannel(contact, "SMS");
  if (sms.allowed) {
    return { channel: "SMS", reason: check.reason };
  }
  return { channel: null, reason: check.reason };
}

module.exports = { prepareRecipient, chooseChannel };
