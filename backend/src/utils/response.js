function sendSuccess(res, data, statusCode = 200, extra = {}) {
  return res.status(statusCode).json({
    data,
    ...extra,
  });
}

function sendError(
  res,
  message,
  statusCode = 400,
  code = "BAD_REQUEST",
  details = undefined,
) {
  const error = { message, code };
  if (details !== undefined) error.details = details;
  return res.status(statusCode).json({ error });
}

module.exports = { sendSuccess, sendError };
