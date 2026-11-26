// Builds a wa.me deep link for manual/assisted WhatsApp outreach in Malawi
function buildWhatsAppLink(phoneE164, text = "") {
  const digits = String(phoneE164 || "").replace(/\D/g, "");
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${digits}${encoded ? `?text=${encoded}` : ""}`;
}

module.exports = { buildWhatsAppLink };
