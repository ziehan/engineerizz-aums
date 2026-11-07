const express = require("express");

module.exports = (controller, limiter) => {
  const router = express.Router();
  router.post("/register", limiter, controller.register);
  router.post("/login", limiter, controller.login);
  return router;
};
