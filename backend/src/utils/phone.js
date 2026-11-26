const DEFAULT_PREFIX_MAP = {
  AIRTEL: ["+26599"],
  TNM: ["+26588"],
};

// Normalises inputs like 0995049331, 0995 049 331, 265995049331, +265995049331 -> +265995049331
function normalizePhone(raw) {
  if (!raw || typeof raw !== "string") return null;

  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00265")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 10) {
    digits = `265${digits.slice(1)}`;
  } else if (digits.length === 9) {
    digits = `265${digits}`;
  }

  if (!/^265\d{9}$/.test(digits)) {
    return null;
  }

  return `+${digits}`;
}

// Detects network (AIRTEL, TNM, OTHER) from a normalised +265 phone and configurable prefix map
function detectNetwork(
  e164Phone,
  prefixMap = DEFAULT_PREFIX_MAP,
  manualOverride = null,
) {
  if (manualOverride && ["AIRTEL", "TNM", "OTHER"].includes(manualOverride)) {
    return manualOverride;
  }
  if (!e164Phone) return "OTHER";

  const airPrefixes = prefixMap?.AIRTEL || DEFAULT_PREFIX_MAP.AIRTEL;
  const tnmPrefixes = prefixMap?.TNM || DEFAULT_PREFIX_MAP.TNM;

  if (airPrefixes.some((p) => e164Phone.startsWith(p))) return "AIRTEL";
  if (tnmPrefixes.some((p) => e164Phone.startsWith(p))) return "TNM";
  return "OTHER";
}

// Masks phone numbers for logs so full numbers aren't leaked in app logs (Section 12.10)
function maskPhone(phone) {
  if (!phone || typeof phone !== "string") return "***";
  const clean = phone.trim();
  if (clean.length <= 4) return "****";
  return `${clean.slice(0, clean.length - 4)}****`;
}

module.exports = {
  DEFAULT_PREFIX_MAP,
  normalizePhone,
  detectNetwork,
  maskPhone,
};
