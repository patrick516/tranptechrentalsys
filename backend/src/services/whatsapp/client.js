// WhatsApp client wrapper
const { buildWhatsAppLink } = require("./link");

async function sendWhatsApp({ toPhone, body }) {
  return {
    channel: "WHATSAPP",
    toPhone,
    waLink: buildWhatsAppLink(toPhone, body),
    status: "SENT",
  };
}

module.exports = { sendWhatsApp };
