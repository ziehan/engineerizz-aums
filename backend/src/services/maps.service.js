const { Client } = require("@googlemaps/google-maps-services-js");
const env = require("../config/env.config");

/**
 * Provides Google Maps reverse geocoding with a deterministic local fallback.
 */
class MapsService {
  /**
   * @param {import("@googlemaps/google-maps-services-js").Client} [client] Google Maps client.
   */
  constructor(client = new Client({})) {
    this.client = client;
  }

  /**
   * Resolves an address from Google Maps with a local fallback.
   *
   * @param {number|string} latitude Geographic latitude from a web request.
   * @param {number|string} longitude Geographic longitude from a web request.
   * @returns {Promise<string>} Resolved address.
   */
  async reverseGeocode(latitude, longitude) {
    const coordinates = this.normalizeCoordinates(latitude, longitude);
    if (!env.mapsApiKey) {
      return this.mockAddress(coordinates.latitude, coordinates.longitude);
    }

    try {
      const response = await this.client.reverseGeocode({
        params: {
          latlng: {
            lat: coordinates.latitude,
            lng: coordinates.longitude,
          },
          key: env.mapsApiKey,
        },
      });
      const result = response.data.results && response.data.results[0];
      if (!result || !result.formatted_address) {
        return this.mockAddress(coordinates.latitude, coordinates.longitude);
      }
      return result.formatted_address;
    } catch (error) {
      console.warn(
        "Google reverse geocoding failed; using development fallback:",
        error.message,
      );
      return this.mockAddress(coordinates.latitude, coordinates.longitude);
    }
  }

  /**
   * Converts web-request coordinates to finite numbers within valid ranges.
   *
   * @param {number|string} latitude Geographic latitude.
   * @param {number|string} longitude Geographic longitude.
   * @returns {{latitude: number, longitude: number}} Normalized coordinates.
   * @throws {Error} If either coordinate is invalid.
   */
  normalizeCoordinates(latitude, longitude) {
    const normalizedLatitude = Number(latitude);
    const normalizedLongitude = Number(longitude);
    if (
      !Number.isFinite(normalizedLatitude) ||
      !Number.isFinite(normalizedLongitude) ||
      normalizedLatitude < -90 ||
      normalizedLatitude > 90 ||
      normalizedLongitude < -180 ||
      normalizedLongitude > 180
    ) {
      const error = new Error(
        "latitude and longitude must be valid coordinates",
      );
      error.statusCode = 400;
      throw error;
    }

    return {
      latitude: normalizedLatitude,
      longitude: normalizedLongitude,
    };
  }

  /**
   * Maps coordinates to a deterministic fallback address.
   *
   * @param {number} latitude Geographic latitude.
   * @param {number} longitude Geographic longitude.
   * @returns {string} Zone address or the default Jakarta address.
   */
  mockAddress(latitude, longitude) {
    const zones = [
      {
        minLat: -6.24,
        maxLat: -6.2,
        minLng: 106.79,
        maxLng: 106.83,
        value: "Kecamatan Kebayoran Baru, Jakarta Selatan",
      },
      {
        minLat: -6.25,
        maxLat: -6.21,
        minLng: 106.84,
        maxLng: 106.88,
        value: "Kecamatan Tebet, Jakarta Selatan",
      },
      {
        minLat: -6.18,
        maxLat: -6.12,
        minLng: 106.79,
        maxLng: 106.84,
        value: "Kecamatan Menteng, Jakarta Pusat",
      },
    ];
    const match = zones.find(
      (zone) =>
        latitude >= zone.minLat &&
        latitude <= zone.maxLat &&
        longitude >= zone.minLng &&
        longitude <= zone.maxLng,
    );
    return match ? match.value : "Jakarta, Daerah Khusus Ibukota Jakarta";
  }
}

module.exports = MapsService;
