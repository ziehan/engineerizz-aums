"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { PRIORITY_COLOR } from "@/lib/report-labels";
import type { Priority } from "@/lib/report-types";

export interface MapPoint {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  priority: Priority;
  href?: string;
}

interface ReportMapProps {
  points: MapPoint[];
  className?: string;
  singleZoom?: number;
}

const JAKARTA: [number, number] = [-6.2088, 106.8456];

/** Pin berbentuk tetesan dengan warna sesuai prioritas laporan. */
function pinHtml(color: string) {
  return `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.2 0 0 7 0 15.7 0 27 16 42 16 42s16-15 16-26.3C32 7 24.8 0 16 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
    <circle cx="16" cy="15.5" r="6" fill="#fff"/></svg>`;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const STYLESHEET_ID = "leaflet-stylesheet";

/**
 * Memuat stylesheet Leaflet dari /public (disalin dari node_modules/leaflet/dist).
 * Tidak di-import langsung karena aturan CSS Turbopack di next.config.ts
 * memproses seluruh *.css dengan loader Tailwind.
 */
function ensureLeafletStyles() {
  if (document.getElementById(STYLESHEET_ID)) return;
  const link = document.createElement("link");
  link.id = STYLESHEET_ID;
  link.rel = "stylesheet";
  link.href = "/leaflet/leaflet.css";
  document.head.appendChild(link);
}

/**
 * Peta interaktif berbasis Leaflet + tile OpenStreetMap.
 * Leaflet dimuat dinamis di sisi klien karena membutuhkan objek `window`.
 */
export function ReportMap({ points, className, singleZoom = 16 }: ReportMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    ensureLeafletStyles();

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
        points[0] ? [points[0].latitude, points[0].longitude] : JAKARTA,
        points.length === 1 ? singleZoom : 11,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      points.forEach((p) => {
        const icon = L.divIcon({
          html: pinHtml(PRIORITY_COLOR[p.priority] ?? PRIORITY_COLOR.Medium),
          className: "",
          iconSize: [32, 42],
          iconAnchor: [16, 42],
          popupAnchor: [0, -38],
        });
        const popup = p.href
          ? `<a href="${p.href}"><strong>${escapeHtml(p.title)}</strong></a>`
          : `<strong>${escapeHtml(p.title)}</strong>`;
        L.marker([p.latitude, p.longitude], { icon }).addTo(map!).bindPopup(popup);
      });

      if (points.length > 1) {
        map.fitBounds(
          L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number])),
          { padding: [30, 30], maxZoom: 15 },
        );
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points, singleZoom]);

  return (
    <div
      ref={containerRef}
      className={cn("z-0 h-64 w-full overflow-hidden rounded-2xl bg-neutral-200 shadow-md", className)}
    />
  );
}
