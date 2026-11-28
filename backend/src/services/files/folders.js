const path = require("path");

const MAX_DEPTH = 8;
const SEGMENT_RE = /[^a-zA-Z0-9._-]/g;

// Cleans one folder name: no path tricks, no spaces, safe for storage keys.
function sanitizeSegment(segment) {
  const cleaned = String(segment || "")
    .replace(SEGMENT_RE, "")
    .replace(/^\.+/, "")
    .trim();
  return cleaned;
}

// Cleans a slash-separated folder path, keeping only safe segments.
// "customers/C-0012/2026/2026-11/letters" stays as it is; "../etc" becomes "etc".
function sanitizeFolder(folder = "general") {
  const parts = String(folder || "general")
    .split("/")
    .map(sanitizeSegment)
    .filter((p) => p && p !== "." && p !== "..")
    .slice(0, MAX_DEPTH);

  if (parts.length === 0) return "general";
  return parts.join("/");
}

// Spec 9.3: customers/<CODE>/<year>/<YYYY-MM>/<kind> or exports/<year>/<YYYY-MM>
function buildDocumentPath({ customer, kind, date }) {
  const day = String(date || "").slice(0, 10);
  const year = (day || new Date().toISOString().slice(0, 10)).slice(0, 4);
  const month = day ? day.slice(0, 7) : `${year}-01`;

  if (customer && customer.code) {
    return sanitizeFolder(
      `customers/${customer.code}/${year}/${month}/${kind || "general"}`,
    );
  }
  return sanitizeFolder(`exports/${year}/${month}/${kind || "general"}`);
}

// Extracts the segments of a stored path that identify a customer.
function splitFolderPath(folderPath = "") {
  const parts = sanitizeFolder(folderPath).split("/").filter(Boolean);
  const customerIdPart = parts[0] === "customers" ? parts[1] || "" : "";
  const kind = parts[parts.length - 1] || "";
  return { customerIdPart, kind, parts };
}

// Extension helper for downloads.
function extensionFor(fileName = "", mimeType = "") {
  const fromName = path.extname(String(fileName || "")).replace(".", "");
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const map = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "text/csv": "csv",
    "text/plain": "txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
  };
  return map[mimeType] || "bin";
}

module.exports = { sanitizeFolder, buildDocumentPath, splitFolderPath, extensionFor };
