const { Client } = require("@googlemaps/google-maps-services-js");
const env = require("../config/env.config");

class MapsService {
  constructor(client = new Client({})) {
    this.client = client;
  }

  /**
   * Mengambil alamat dari Google Maps dengan fallback alamat mock.
   *
   * @param {number} latitude Latitude lokasi
   * @param {number} longitude Longitude lokasi
   * @returns {Promise<string>} Alamat lokasi
   */
  async reverseGeocode(latitude, longitude) {
    if (!env.mapsApiKey) {
      return this.mockAddress(latitude, longitude);
    }

    try {
      const response = await this.client.reverseGeocode({
        params: {
          latlng: { lat: latitude, lng: longitude },
          key: env.mapsApiKey,
        },
      });
      const result = response.data.results && response.data.results[0];
      if (!result || !result.formatted_address) {
        return this.mockAddress(latitude, longitude);
      }
      return result.formatted_address;
    } catch (error) {
      console.warn(
        "Google reverse geocoding failed; using development fallback:",
        error.message,
      );
      return this.mockAddress(latitude, longitude);
    }
  }

  /**
   * Memetakan koordinat ke alamat mock berdasarkan zona Jakarta.
   *
   * @param {number} latitude Latitude lokasi
   * @param {number} longitude Longitude lokasi
   * @returns {string} Alamat zona atau alamat default Jakarta
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
