/**
 * Middleware ensuring incoming requests originate from authenticated internal backend services.
 * Validates the `x-internal-api-key` header against the configured `INTERNAL_API_KEY`.
 *
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {void}
 */
function authInternal(req, res, next) {
  const expectedKey = process.env.INTERNAL_API_KEY;
  const receivedKey = req.get("x-internal-api-key");

  if (!expectedKey || !receivedKey || receivedKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized internal service call",
    });
  }

  return next();
}

module.exports = authInternal;
