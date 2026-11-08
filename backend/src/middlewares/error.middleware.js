/**
 * Centralized Express error-handling middleware mapping domain errors to HTTP statuses.
 *
 * @param {Error} error - Captured exception.
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {import("express").Response|void}
 */
function errorMiddleware(error, req, res, next) {
  if (res.headersSent) return next(error);

  const statusCode =
    error.statusCode ||
    (error.code === "LIMIT_FILE_SIZE" ||
    error.code === "LIMIT_UNEXPECTED_FILE" ||
    error.message === "Only image uploads are supported"
      ? 400
      : error.code === "P2025"
        ? 404
        : error.code === "P2002"
          ? 409
          : 500);

  if (statusCode >= 500) {
    console.error(`${req.method} ${req.originalUrl}`, {
      name: error.name,
      code: error.code,
      message: error.message,
      statusCode,
    });
  }

  if (error.code === "AI_SERVICE_TIMEOUT") {
    return res.status(504).json({
      success: false,
      error: "AI_SERVICE_TIMEOUT",
      message: error.message || "AI service request timed out",
    });
  }

  if (error.isAiServiceUnavailable || error.code === "AI_SERVICE_DOWN") {
    return res.status(503).json({
      success: false,
      error: "AI_SERVICE_UNAVAILABLE",
      message: error.message || "AI service is unavailable",
    });
  }

  return res.status(statusCode).json({
    success: false,
    error: error.code || "INTERNAL_SERVER_ERROR",
    message: getErrorMessage(error, statusCode),
  });
}

/**
 * Resolves safe client-facing error messages depending on status and error code.
 *
 * @param {Error} error - Application error.
 * @param {number} statusCode - Mapped HTTP status code.
 * @returns {string} Sanitized error message string.
 */
function getErrorMessage(error, statusCode) {
  if (
    error.code === "INVALID_AI_RESPONSE" ||
    error.code === "AI_SERVICE_REQUEST_FAILED" ||
    error.code === "AI_SERVICE_BAD_REQUEST"
  ) {
    return error.message;
  }
  if (error.code === "P2025") return "Report not found";
  if (error.code === "P2002") {
    return "A report with the same unique value already exists";
  }
  return statusCode >= 500 ? "Internal server error" : error.message;
}

module.exports = errorMiddleware;
