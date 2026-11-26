const { AppError } = require("./errors");

function requireDocumentPayload(req, _res, next) {
  if (!req.body || typeof req.body !== "object") {
    return next(
      new AppError("Document payload is required", 400, "VALIDATION_ERROR"),
    );
  }
  return next();
}

module.exports = { requireDocumentPayload };
