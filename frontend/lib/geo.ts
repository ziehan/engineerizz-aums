export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const GEO_ERRORS: Record<number, string> = {
  1: "Akses lokasi ditolak pengguna.",
  2: "Sinyal GPS tidak tersedia.",
  3: "Waktu permintaan lokasi habis (timeout).",
};

export function getCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Browser tidak mendukung Web Geolocation API."));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
        }),
      (err) => reject(new Error(GEO_ERRORS[err.code] || `GPS Error: ${err.message}`)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal me-load file ke objek Image."));
      img.onload = () => resolve(img);
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function stampWatermark(
  file: File,
  lat: number,
  lng: number,
): Promise<File> {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung browser ini.");
  ctx.drawImage(img, 0, 0);

  const barHeight = Math.max(60, Math.floor(img.height * 0.1));
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, img.height - barHeight, img.width, barHeight);

  ctx.font = `bold ${Math.max(14, Math.floor(barHeight * 0.28))}px monospace`;
  ctx.fillStyle = "#00FF66";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `LOC: ${lat.toFixed(6)}, ${lng.toFixed(6)} | TIME: ${new Date().toISOString()}`,
    20,
    img.height - barHeight / 2,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Gagal export Blob canvas."));
        resolve(new File([blob], `verified-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.85,
    );
  });
}
