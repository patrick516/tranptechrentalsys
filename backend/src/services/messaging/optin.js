// Opt-in rules. A contact must tick the relevant box before we send on that
// channel; everyone else falls back to the other channel.
function canSendChannel(contact, channel) {
  if (!contact) return { allowed: false, reason: "NO_CONTACT" };

  if (channel === "SMS") {
    if (contact.smsOptOut) return { allowed: false, reason: "SMS_OPT_OUT" };
    if (!contact.phone) return { allowed: false, reason: "NO_PHONE" };
    return { allowed: true };
  }

  if (channel === "WHATSAPP") {
    if (!contact.whatsappOptIn) {
      return { allowed: false, reason: "WHATSAPP_OPT_OUT" };
    }
    if (!contact.phone) return { allowed: false, reason: "NO_PHONE" };
    return { allowed: true };
  }

  return { allowed: false, reason: "UNKNOWN_CHANNEL" };
}

module.exports = { canSendChannel };
