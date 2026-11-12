"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import useReportList from "@/hooks/useReportList";
import type { MapPoint } from "./ReportsMapView";

const ReportsMapView = dynamic(() => import("./ReportsMapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-neutral-200" />,
});

const LEGEND = [
  { label: "Tinggi", color: "bg-red-600" },
  { label: "Sedang", color: "bg-amber-500" },
  { label: "Rendah", color: "bg-green-600" },
];

function hasValidCoords(lat: unknown, lng: unknown) {
  if (lat == null || lng == null) return false; 
  const la = Number(lat);
  const lo = Number(lng);
  return Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
}

interface PublicReportsMapProps {
  title?: string;
  className?: string;
}

export function PublicReportsMap({ title = "Peta", className }: PublicReportsMapProps) {
  const { reports, isLoading, error } = useReportList();

  const points = useMemo<MapPoint[]>(
    () =>
      reports
        .filter((r) => hasValidCoords(r.latitude, r.longitude))
        .map((r) => ({
          id: r.id,
          title: r.title,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          priority: r.priority,
          status: r.status,
          href: `/reports/${r.id}`,
        })),
    [reports],
  );

  return (
    <section className={cn("flex w-full flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-bold text-neutral-1000">{title}</h3>
        {!isLoading && !error && (
          <span className="text-xs font-medium text-neutral-500">{points.length} lokasi</span>
        )}
      </div>

      <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-neutral-300 bg-neutral-200 shadow-sm md:h-80">
        {isLoading ? (
          <div className="h-full w-full animate-pulse bg-neutral-200" />
        ) : error ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-red-500">
            {error}
          </div>
        ) : (
          <>
            <ReportsMapView points={points} />

            {points.length === 0 && (
              <div className="pointer-events-none absolute inset-0 z-1000 flex items-center justify-center bg-white/70 text-sm font-medium text-neutral-600">
                Belum ada lokasi aduan untuk ditampilkan.
              </div>
            )}

            <ul className="pointer-events-none absolute bottom-3 left-3 z-1000 flex gap-3 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-800 shadow">
              {LEGEND.map((item) => (
                <li key={item.label} className="flex items-center gap-1.5">
                  <span className={cn("h-2.5 w-2.5 rounded-full", item.color)} />
                  {item.label}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}