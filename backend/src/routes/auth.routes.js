const express = require("express");

/**
 * Express router factory configuring authentication, officer management, and department routes.
 *
 * @description
 * Mounts public endpoints (/register, /login, /departments) and protected endpoints (/logout, /me, /officers)
 * with rate limiters and authentication/role guards.
 *
 * @param {import("../controllers/auth.controller")} controller - AuthController instance.
 * @param {Function} [publicLimiter] - Rate limiter middleware for public routes.
 * @param {Function} [protectedLimiter] - Rate limiter middleware for protected routes.
 * @param {Function} [authMiddleware] - JWT verification middleware.
 * @param {Function} [adminOnly] - Role authorization middleware permitting ADMIN only.
 * @returns {import("express").Router} Configured Express router.
 */
module.exports = (
  controller,
  publicLimiter = (_req, _res, next) => next(),
  protectedLimiter = (_req, _res, next) => next(),
  authMiddleware = (_req, _res, next) => next(),
  adminOnly = (_req, _res, next) => next(),
) => {
  const router = express.Router();

  router.post("/register", publicLimiter, controller.register);
  router.post("/login", publicLimiter, controller.login);
  router.post("/logout", protectedLimiter, authMiddleware, controller.logout);
  router.get("/me", protectedLimiter, authMiddleware, controller.me);
  router.post(
    "/officers",
    protectedLimiter,
    authMiddleware,
    adminOnly,
    controller.createOfficer,
  );
  router.get("/departments", publicLimiter, controller.listDepartments);

  return router;
};
