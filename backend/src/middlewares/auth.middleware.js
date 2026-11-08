const jwt = require("jsonwebtoken");
const env = require("../config/env.config");

const roles = new Set(["CITIZEN", "FIELD_OFFICER", "ADMIN"]);

/**
 * Middleware validating Bearer JWT tokens in Authorization headers.
 *
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {import("express").Response|void}
 */
function authenticate(req, res, next) {
  const header = req.get("authorization");
  const [scheme, token] = header ? header.split(" ") : [];
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid token payload");
    }
    const role = String(payload.role || "").toUpperCase();
    if (!roles.has(role)) {
      return res.status(403).json({
        success: false,
        message: "Unsupported user role",
      });
    }
    req.user = { ...payload, role };
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
}

/**
 * Middleware factory restricting endpoint access to specific user roles.
 *
 * @param {...string} allowedRoles - User roles authorized to access the route.
 * @returns {import("express").RequestHandler} Authorization middleware handler.
 */
function requireRoles(...allowedRoles) {
  const allowed = new Set(allowedRoles);
  return (req, res, next) => {
    if (!req.user || !allowed.has(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }
    return next();
  };
}

module.exports = { authenticate, requireRoles };
