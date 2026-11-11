/**
 * Controller handling geolocation and reverse geocoding routes.
 *
 * @description
 * Exposes HTTP handlers for resolving physical street addresses from decimal latitude and longitude
 * coordinates received from client browser Web Geolocation API (`navigator.geolocation`).
 */
class MapsController {
  /**
   * Initializes MapsController with a MapsService instance.
   *
   * @description
   * Stores MapsService dependency and binds route methods to the controller instance.
   *
   * @param {import("../services/maps.service")} mapsService - Maps service dependency.
   */
  constructor(mapsService) {
    this.mapsService = mapsService;
    this.reverseGeocode = this.reverseGeocode.bind(this);
  }

  /**
   * Validates coordinate inputs from browser Web Geolocation API and resolves
   * them into human-readable physical addresses.
   *
   * @description
   * Handles GET /api/v1/maps/reverse-geocode endpoint.
   * Supports flexible query parameter names: `lat` or `latitude`, and `lng`, `lon`, or `longitude`.
   * Enforces strict validation: finite numbers within [-90, 90] for latitude and [-180, 180] for longitude.
   *
   * @param {import("express").Request} req - Express request containing query parameters (`lat`/`latitude`, `lng`/`lon`/`longitude`).
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<void>} Sends HTTP 200 OK with resolved street address `{ data: { address: string } }`.
   * @throws {Error} Throws 400 Bad Request if coordinates are missing, non-numeric, or out of geographical bounds.
   */
  async reverseGeocode(req, res, next) {
    try {
      const rawLat = req.query.lat ?? req.query.latitude;
      const rawLng = req.query.lng ?? req.query.lon ?? req.query.longitude;

      const latitude =
        rawLat !== undefined &&
        typeof rawLat === "string" &&
        rawLat.trim() === ""
          ? NaN
          : Number(rawLat);
      const longitude =
        rawLng !== undefined &&
        typeof rawLng === "string" &&
        rawLng.trim() === ""
          ? NaN
          : Number(rawLng);

      if (
        rawLat === undefined ||
        rawLng === undefined ||
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
