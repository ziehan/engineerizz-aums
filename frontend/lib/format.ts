/** Utilitas format tampilan: angka, tanggal, sapaan, dan zona waktu. */

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Menyingkat angka besar */
export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}jt`;
  if (value >= 1_000) return `${trim(value / 1_000)}rb`;
  return String(value);
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "").replace(".", ",");
}

/** Sapaan berdasarkan jam lokal pengguna. */
export function getGreeting(date: Date): "Pagi" | "Siang" | "Sore" | "Malam" {
  const hour = date.getHours();
  if (hour < 11) return "Pagi";
  if (hour < 15) return "Siang";
  if (hour < 18) return "Sore";
  return "Malam";
}

/** Zona waktu Indonesia (WIB/WITA/WIT) berdasarkan offset perangkat. */
export function getIndonesianZone(date: Date): string {
  const offsetHours = -date.getTimezoneOffset() / 60;
  if (offsetHours === 7) return "WIB";
  if (offsetHours === 8) return "WITA";
  if (offsetHours === 9) return "WIT";
  return `UTC${offsetHours >= 0 ? "+" : ""}${offsetHours}`;
}

export function formatClock(date: Date): string {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(" : ");
}

export function formatLongDate(date: Date): string {
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${time}`;
}

export function truncate(text: string | undefined, max = 140): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}
