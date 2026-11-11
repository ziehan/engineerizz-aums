const crypto = require("node:crypto");

/**
 * Middleware ensuring incoming requests originate from authenticated internal backend services.
 *
 * @description
 * Enforces inter-microservice security by checking the `x-internal-api-key` header:
 * 1. Verifies that `INTERNAL_API_KEY` is configured in the environment and present in the request header.
 * 2. Converts both keys into byte buffers and checks length equality.
 * 3. Utilizes `crypto.timingSafeEqual()` for constant-time comparison, eliminating timing differences
 *    that could be exploited in side-channel timing attacks.
 * 4. Rejects invalid or missing keys with HTTP 401 Unauthorized.
 *
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {import("express").Response|void} Passes to next middleware or returns HTTP 401 JSON.
 */
function authInternal(req, res, next) {
  const expectedKey = process.env.INTERNAL_API_KEY;
  const receivedKey = req.get("x-internal-api-key");

  if (!expectedKey || !receivedKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized internal service call",
    });
  }

  const expectedBuffer = Buffer.from(expectedKey);
  const receivedBuffer = Buffer.from(receivedKey);

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized internal service call",
    });
  }

  return next();
}

module.exports = authInternal;
