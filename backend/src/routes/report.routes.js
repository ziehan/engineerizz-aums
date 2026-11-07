const express = require("express");

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
) => {
  const router = express.Router();
  if (pipelineController) {
    router.post(
      "/intake",
      publicLimiter,
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
      "/verify/:id",
      protectedLimiter,
      authMiddleware,
      officerOrAdmin,
      imageMiddleware.uploadImage,
      imageMiddleware.processImage,
      validateVerificationPayload,
      pipelineController.verify,
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
  router.post("/", publicLimiter, validatePayload, controller.create);
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
    controller.verify,
  );
  return router;
};
