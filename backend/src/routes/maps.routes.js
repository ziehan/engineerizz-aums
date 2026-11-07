const express = require("express");

module.exports = (controller) => {
  const router = express.Router();
  router.get("/reverse-geocode", controller.reverseGeocode);
  return router;
};
