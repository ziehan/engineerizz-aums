const express = require("express");

/**
 * Express router factory configuring AUMS citizen complaint, intake, planning, and verification routes.
 *
 * @description
 * Sets up rate limiters, Multer image upload middlewares, Sharp compression, Zod payload validators,
 * and role-based guards across public intake and authenticated officer/admin endpoints.
 *
 * @param {import("../controllers/report.controller")} controller - ReportController instance.
 * @param {Function} validatePayload - Zod middleware validating report payloads.
 * @param {import("../controllers/report.controller")} [pipelineController] - Optional pipeline controller instance.
 * @param {Object} imageMiddleware - Multer and Sharp image processing middleware bundle.
 * @param {Function} [validateVerificationPayload] - Zod middleware validating verification coordinates.
 * @param {Function} [authMiddleware] - JWT authentication middleware.
 * @param {Function} [citizenOrAdmin] - Guard allowing CITIZEN, FIELD_OFFICER, CRM_OFFICER, ADMIN.
 * @param {Function} [officerOrAdmin] - Guard allowing FIELD_OFFICER, CRM_OFFICER, ADMIN.
 * @param {Function} [adminOnly] - Guard allowing ADMIN only.
 * @param {Function} [publicLimiter] - Rate limiter for public endpoints.
 * @param {Function} [protectedLimiter] - Rate limiter for protected endpoints.
 * @param {Function} [optionalAuthMiddleware] - Optional JWT authentication middleware for attaching user context.
 * @param {Function} [citizenOnly] - Guard allowing CITIZEN only.
 * @returns {import("express").Router} Configured Express router.
 */
module.exports = (
  controller,
  validatePayload,
  pipelineController,
  imageMiddleware,
  validateVerificationPayload = validatePayload,
  authMiddleware = (_req, _res, next) => next(),
  citizenOrAdmin = authMiddleware,
  officerOrAdmin = authMiddleware,
  adminOnly = authMiddleware,
  publicLimiter = (_req, _res, next) => next(),
  protectedLimiter = (_req, _res, next) => next(),
  optionalAuthMiddleware = (_req, _res, next) => next(),
  citizenOnly = authMiddleware,
) => {
  const router = express.Router();
  if (pipelineController) {
    router.post(
      "/intake",
      protectedLimiter,
      authMiddleware,
      citizenOnly,
      imageMiddleware.uploadImage,
      imageMiddleware.processImage,
      validatePayload,
      pipelineController.intake,
    );
    router.post(
      "/plan",
      protectedLimiter,
      authMiddleware,
      officerOrAdmin,
      pipelineController.plan,
    );
    router.post(
      "/plan/:id",
      protectedLimiter,
      authMiddleware,
      officerOrAdmin,
      pipelineController.plan,
    );
    router.post(
      "/verify",
      protectedLimiter,
      authMiddleware,
      officerOrAdmin,
      imageMiddleware.uploadImage,
      imageMiddleware.processImage,
      validateVerificationPayload,
      pipelineController.verify,
    );
  }
  router.post(
    "/",
    protectedLimiter,
    authMiddleware,
    citizenOnly,
    validatePayload,
    controller.create,
  );
  router.get("/me", protectedLimiter, authMiddleware, controller.getMyReports);
  router.get(
    "/",
    protectedLimiter,
    authMiddleware,
    citizenOrAdmin,
    controller.list,
  );
  router.delete(
    "/duplicates/:duplicateId",
    protectedLimiter,
    authMiddleware,
    adminOnly,
    controller.deleteDuplicate,
  );
  router.get(
    "/:id",
    protectedLimiter,
    authMiddleware,
    citizenOrAdmin,
    controller.get,
  );
  router.delete(
    "/:id",
    protectedLimiter,
    authMiddleware,
    adminOnly,
    controller.delete,
  );
  router.patch(
    "/:id/approve",
    protectedLimiter,
    authMiddleware,
    adminOnly,
    controller.approve,
  );
  router.post(
    "/:id/verify",
    protectedLimiter,
    authMiddleware,
    officerOrAdmin,
    imageMiddleware.uploadImage,
    imageMiddleware.processImage,
    validateVerificationPayload,
    controller.verify,
  );
  return router;
};
