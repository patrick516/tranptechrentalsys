function formatLog(level, message, meta) {
  const ts = new Date().toISOString();
  if (meta !== undefined) {
    return `[${ts}] [${level}] ${message} ${typeof meta === "string" ? meta : JSON.stringify(meta)}`;
  }
  return `[${ts}] [${level}] ${message}`;
}

const logger = {
  info: (msg, meta) => console.log(formatLog("INFO", msg, meta)),
  warn: (msg, meta) => console.warn(formatLog("WARN", msg, meta)),
  error: (msg, meta) => console.error(formatLog("ERROR", msg, meta)),
};

module.exports = logger;
