/**
 * Controller handling geolocation and reverse geocoding routes.
 */
class MapsController {
  /**
   * @param {import("../services/maps.service")} mapsService - Maps service instance.
   */
  constructor(mapsService) {
    this.mapsService = mapsService;
    this.reverseGeocode = this.reverseGeocode.bind(this);
  }

  /**
   * Validates coordinate inputs and resolves them into human-readable physical addresses.
   *
   * @param {import("express").Request} req - Express request containing query parameters `lat` and `lng`.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<void>} Resolves reverse geocoded address.
   */
  async reverseGeocode(req, res, next) {
    try {
      const latitude = Number(req.query.lat);
      const longitude = Number(req.query.lng);
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        const error = new Error("lat and lng must be valid coordinates");
        error.statusCode = 400;
        throw error;
      }
      res.json({
        data: {
          address: await this.mapsService.reverseGeocode(latitude, longitude),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MapsController;
