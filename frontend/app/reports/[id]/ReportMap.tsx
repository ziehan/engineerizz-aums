"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface ReportMapProps {
    latitude: number;
    longitude: number;
    label?: string;
}

export default function ReportMap({ latitude, longitude, label }: ReportMapProps) {
    const position: [number, number] = [latitude, longitude];

    return (
        <MapContainer
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