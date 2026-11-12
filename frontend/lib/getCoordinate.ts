export function getCoordinates(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Browser tidak mendukung Web Geolocation API."));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
        });
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: "Akses lokasi ditolak pengguna.",
          2: "Sinyal GPS tidak tersedia.",
          3: "Waktu permintaan lokasi habis (timeout).",
        };
        reject(new Error(msgs[err.code] || `GPS Error: ${err.message}`));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}