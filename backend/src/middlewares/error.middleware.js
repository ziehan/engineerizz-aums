/**
 * Centralized Express error-handling middleware mapping domain errors to HTTP statuses.
 *
 * @description
 * Catches all uncaught domain and infrastructure exceptions in the Express pipeline:
 * - Prisma P2025: Maps to HTTP 404 ("Report not found").
 * - Prisma P2002: Maps to HTTP 409 ("A report with the same unique value already exists").
 * - Multer LIMIT_FILE_SIZE / LIMIT_UNEXPECTED_FILE: Maps to HTTP 400.
 * - Multer INVALID_FILE_TYPE: Maps to HTTP 400 with user-friendly Indonesian message.
 * - AI_SERVICE_TIMEOUT: Maps to HTTP 504 Gateway Timeout.
 * - AI_SERVICE_DOWN / isAiServiceUnavailable: Maps to HTTP 503 Service Unavailable.
 * - AI_SERVICE_REQUEST_FAILED / INVALID_AI_RESPONSE: Maps to HTTP 502 Bad Gateway.
 * - Generic/Unknown exceptions: Maps to HTTP 500 Internal Server Error.
 *
 * @param {Error|Object} error - Captured exception instance.
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {import("express").Response|void} Formatted JSON error response with status code.
 */
function errorMiddleware(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (
    error.code === "INVALID_FILE_TYPE" ||
    error.message ===
      "Format file tidak didukung. Harap unggah foto dengan format JPEG, PNG, atau WebP." ||
    error.message === "Only image uploads are supported"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Format file tidak didukung. Harap unggah foto dengan format JPEG, PNG, atau WebP.",
    });
  }

  const statusCode =
    error.statusCode ||
    (error.code === "LIMIT_FILE_SIZE" || error.code === "LIMIT_UNEXPECTED_FILE"
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
