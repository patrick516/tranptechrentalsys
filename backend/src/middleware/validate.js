// Strips NoSQL injection operators ($ / .) and validates body/query/params with Zod (Section 12.4)
const { AppError } = require("./errors");

function stripDangerousKeys(value) {
  if (Array.isArray(value)) {
    return value.map(stripDangerousKeys);
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) {
        throw new AppError(
          `Invalid field name: ${key}`,
          400,
          "VALIDATION_ERROR",
        );
      }
      clean[key] = stripDangerousKeys(val);
    }
    return clean;
  }
  return value;
}

function sanitizeRequest(req, _res, next) {
  try {
    if (req.body) req.body = stripDangerousKeys(req.body);
    if (req.query) req.query = stripDangerousKeys(req.query);
    if (req.params) req.params = stripDangerousKeys(req.params);
    next();
  } catch (err) {
    next(err);
  }
}

function validate(schemas = {}) {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        const parsed = schemas.body.safeParse(req.body);
        if (!parsed.success) {
          return next(
            new AppError(
              "Invalid request body",
              400,
              "VALIDATION_ERROR",
              parsed.error.issues,
            ),
          );
        }
        req.body = parsed.data;
      }
      if (schemas.query) {
        const parsed = schemas.query.safeParse(req.query);
        if (!parsed.success) {
          return next(
            new AppError(
              "Invalid query parameters",
              400,
              "VALIDATION_ERROR",
              parsed.error.issues,
            ),
          );
        }
        req.query = parsed.data;
      }
      if (schemas.params) {
        const parsed = schemas.params.safeParse(req.params);
        if (!parsed.success) {
          return next(
            new AppError(
              "Invalid route parameters",
              400,
              "VALIDATION_ERROR",
              parsed.error.issues,
            ),
          );
        }
        req.params = parsed.data;
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = {
  sanitizeRequest,
  validate,
};
