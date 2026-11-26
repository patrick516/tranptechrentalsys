// Messaging opt-in helper enforcing smsOptOut checks
function canSendChannel(contact, channel) {
  if (!contact) return { allowed: false, reason: "NO_CONTACT" };
  if (channel === "SMS" && contact.smsOptOut) {
    return { allowed: false, reason: "SMS_OPT_OUT" };
  }
  return { allowed: true };
}

module.exports = { canSendChannel };
