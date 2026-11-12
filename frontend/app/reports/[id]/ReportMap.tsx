"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useMapKey } from "@/hooks/useMapReady";

interface ReportMapProps {
    latitude: number;
    longitude: number;
    label?: string;
}

export default function ReportMap({ latitude, longitude, label }: ReportMapProps) {
    const mapKey = useMapKey();

    if (mapKey === null) {
        return <div className="h-full w-full animate-pulse bg-neutral-200" />;
    }

    const position: [number, number] = [latitude, longitude];

    return (
        <MapContainer
            key={mapKey}
            center={position}
            zoom={16}
            scrollWheelZoom={false}
            className="h-full w-full"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <CircleMarker
                center={position}
                radius={10}
                pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.8 }}
            >
                {label && <Popup>{label}</Popup>}
            </CircleMarker>
        </MapContainer>
    );
}