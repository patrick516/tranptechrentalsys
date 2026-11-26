const path = require("path");

function sanitizeFolder(folder = "general") {
  return (
    path.basename(String(folder || "general")).replace(/[^a-zA-Z0-9_-]/g, "") ||
    "general"
  );
}

module.exports = { sanitizeFolder };
