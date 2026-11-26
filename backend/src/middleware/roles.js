const { AppError } = require("./errors");

function requireRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
    }
    if (
      !allowedRoles ||
      allowedRoles.length === 0 ||
      !allowedRoles.includes(req.user.role)
    ) {
      return next(
        new AppError(
          "Insufficient permissions for this action",
          403,
          "FORBIDDEN",
        ),
      );
    }
    return next();
  };
}

module.exports = { requireRoles };
