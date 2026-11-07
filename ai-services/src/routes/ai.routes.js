const express = require("express");
const { sanitizeRequest } = require("../middlewares/sanitize.middleware");
const authInternal = require("../middlewares/authInternal.middleware");
const controller = require("../controllers/ai.controller");

const router = express.Router();
router.use(authInternal);
router.use(sanitizeRequest);
router.post("/validate", controller.validate);
router.post("/plan", controller.plan);
router.post("/verify", controller.verify);
router.post("/intake", controller.validate);
router.post("/planning", controller.plan);
router.post("/verification", controller.verify);

module.exports = router;
