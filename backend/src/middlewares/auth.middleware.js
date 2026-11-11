const jwt = require("jsonwebtoken");
const env = require("../config/env.config");

const roles = new Set(["CITIZEN", "FIELD_OFFICER", "CRM_OFFICER", "ADMIN"]);
const revokedTokens = new Set();

/**
 * Revokes a JWT token by adding it to the in-memory blacklist.
 *
 * @param {string} token - Bearer token string to revoke.
 */
function revokeToken(token) {
  if (typeof token === "string" && token.trim()) {
    revokedTokens.add(token.trim());
  }
}

/**
 * Checks whether a JWT token has been revoked.
 *
 * @param {string} token - Token to check.
 * @returns {boolean} True if token is blacklisted.
 */
function isTokenRevoked(token) {
  return revokedTokens.has(String(token || "").trim());
}

/**
 * Middleware validating Bearer JWT tokens in Authorization headers.
 *
 * @description
 * Enforces token authentication on protected endpoints:
 * 1. Checks `Authorization: Bearer <token>` header format.
 * 2. Verifies whether token has been revoked via in-memory blacklist (`isTokenRevoked`).
 * 3. Verifies cryptographic signature using `env.jwtSecret`.
 * 4. Asserts that the role belongs to permitted UserRole enum (`CITIZEN`, `FIELD_OFFICER`, `CRM_OFFICER`, `ADMIN`).
 * 5. Attaches sanitized credentials to `req.user` (`userId`, `id`, `email`, `role`, `departmentId`, `nip`) and `req.token`.
 *
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {import("express").Response|void} Returns HTTP 401 for missing/invalid/revoked tokens, HTTP 403 for unsupported roles.
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

  if (isTokenRevoked(token)) {
    return res.status(401).json({
      success: false,
      message: "Token has been revoked",
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
    req.token = token;
    req.user = {
      userId: payload.userId || payload.id,
      id: payload.userId || payload.id,
      email: payload.email,
      role,
      departmentId: payload.departmentId || null,
      nip: payload.nip || null,
    };
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

module.exports = {
  authenticate,
  requireRoles,
  revokeToken,
  isTokenRevoked,
};
