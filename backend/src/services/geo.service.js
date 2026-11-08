const axios = require("axios");
const env = require("../config/env.config");

class GeoService {
  constructor(httpClient = axios, options = {}) {
    this.httpClient = httpClient;
    this.baseUrl = options.baseUrl || env.nominatimUrl;
    this.userAgent = options.userAgent || env.nominatimUserAgent;
    this.timeout = options.timeout || 5000;
  }

  /**
   * Mengambil alamat dari Nominatim berdasarkan koordinat geografis.
   *
   * @param {number|string} latitude Latitude lokasi
   * @param {number|string} longitude Longitude lokasi
   * @returns {Promise<object>} Data alamat hasil reverse geocoding
   */
  async reverseGeocode(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      const error = new Error(
        "latitude and longitude must be valid coordinates",
      );
      error.statusCode = 400;
      throw error;
    }

    const response = await this.httpClient.get(`${this.baseUrl}/reverse`, {
      params: {
        lat,
        lon: lng,
        format: "jsonv2",
        addressdetails: 1,
        "accept-language": "id",
      },
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json",
      },
      timeout: this.timeout,
    });
    const address = response.data?.address;
    if (!response.data?.display_name || !address) {
      const error = new Error(
        "Nominatim returned no address for these coordinates",
      );
      error.statusCode = 502;
      throw error;
    }

    return {
      displayName: response.data.display_name,
      road: address.road || address.pedestrian || null,
      district:
        address.suburb ||
        address.neighbourhood ||
        address.city_district ||
        address.district ||
        null,
      city: address.city || address.town || address.municipality || "Jakarta",
      state: address.state || null,
      postcode: address.postcode || null,
    };
  }
}

module.exports = GeoService;
