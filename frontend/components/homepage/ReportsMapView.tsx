"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useMapKey } from "@/hooks/useMapReady";
import "leaflet/dist/leaflet.css";

export interface MapPoint {
    id: string;
    title: string;
    latitude: number;
    longitude: number;
    priority: string;
    status: string;
    href: string;
}

const DEFAULT_CENTER: [number, number] = [-6.2088, 106.8456];

const PRIORITY_COLOR: Record<string, string> = {
    High: "#dc2626",
    Medium: "#f59e0b",
    Low: "#16a34a",
};

const PRIORITY_ORDER: Record<string, number> = { Low: 0, Medium: 1, High: 2 };

function FitBounds({ points }: { points: MapPoint[] }) {
    const map = useMap();

    useEffect(() => {
        if (points.length === 0) return;
        map.fitBounds(
            points.map((p) => [p.latitude, p.longitude] as [number, number]),
            { padding: [40, 40], maxZoom: 16 },
        );
    }, [points, map]);

    return null;
}

export default function ReportsMapView({ points }: { points: MapPoint[] }) {
    const mapKey = useMapKey();
    const sorted = useMemo(
        () =>
            [...points].sort(
                (a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1),
            ),
        [points],
    );

    if (mapKey === null) {
        return <div className="h-full w-full animate-pulse bg-neutral-200" />;
    }

    return (
        <MapContainer
            key={mapKey}
            center={DEFAULT_CENTER}
            zoom={11}
            scrollWheelZoom={false}
            className="relative z-0 h-full w-full"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={points} />

            {sorted.map((p) => {
                const color = PRIORITY_COLOR[p.priority] ?? "#475569";
                return (
                    <CircleMarker
                        key={p.id}
                        center={[p.latitude, p.longitude]}
                        radius={9}
                        pathOptions={{ color: "#ffffff", weight: 2, fillColor: color, fillOpacity: 0.9 }}
                    >
                        <Popup>
                            <div className="flex min-w-40 flex-col gap-1">
                                <div className="text-sm font-semibold text-neutral-1000">{p.title}</div>
                                <div className="text-xs text-neutral-600">
                                    Prioritas {p.priority} · {p.status}
                                </div>
                                <Link href={p.href} className="text-xs font-semibold text-blue-600 hover:underline">
                                    Lihat detail
                                </Link>
                            </div>
                        </Popup>
                    </CircleMarker>
                );
            })}
        </MapContainer>
    );
}