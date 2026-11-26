// WhatsApp webhook payload parser
function parseWhatsAppWebhook(body = {}) {
  return {
    received: true,
    eventCount: Array.isArray(body.entry) ? body.entry.length : 0,
  };
}

module.exports = { parseWhatsAppWebhook };
