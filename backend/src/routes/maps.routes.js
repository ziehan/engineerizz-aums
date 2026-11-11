const express = require("express");

/**
 * Express router factory configuring geocoding and mapping routes.
 *
 * @description
 * Exposes GET /reverse-geocode for converting browser Web Geolocation coordinates to street addresses.
 *
 * @param {import("../controllers/maps.controller")} controller - MapsController instance.
 * @returns {import("express").Router} Configured Express router.
 */
module.exports = (controller) => {
  const router = express.Router();
  router.get("/reverse-geocode", controller.reverseGeocode);
  return router;
};
