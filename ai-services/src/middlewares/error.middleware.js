/**
 * Centralized error-handling middleware converting unhandled exceptions into safe HTTP responses.
 *
 * @param {Error} error - Captured runtime error.
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {import("express").Response|void}
 */
function errorMiddleware(error, req, res, next) {
  if (res.headersSent) return next(error);
  console.error("[aums-ai-services] Unhandled request error:", error);
  return res.status(200).json({
    success: false,
    fallbackUsed: true,
    usedProvider: "safe-default",
    executionTimeMs: 0,
    error: "AI service temporarily unavailable",
    data: null,
  });
}

module.exports = errorMiddleware;
