"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useMapKey } from "@/hooks/useMapReady";

interface LocationPickerProps {
    latitude: number | null;
    longitude: number | null;
    onChange: (lat: number, lng: number) => void;
}

const DEFAULT_CENTER: [number, number] = [-6.2088, 106.8456];

function ClickHandler({ onChange }: { onChange: LocationPickerProps["onChange"] }) {
    useMapEvents({
        click(e) {
            onChange(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
        },
    });
    return null;
}

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
    const map = useMap();
    useEffect(() => {
        if (lat == null || lng == null) return;
        if (map.getZoom() < 15) map.setView([lat, lng], 17);
        else if (!map.getBounds().contains([lat, lng])) map.panTo([lat, lng]);
    }, [lat, lng, map]);
    return null;
}

export default function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
    const mapKey = useMapKey();
    const hasPosition = latitude != null && longitude != null;

    if (mapKey === null) {
        return <div className="h-full w-full animate-pulse bg-neutral-200" />;
    }

    return (
        <MapContainer
            key={mapKey}
            center={hasPosition ? [latitude, longitude] : DEFAULT_CENTER}
            zoom={hasPosition ? 17 : 12}
            scrollWheelZoom={false}
            className="relative z-0 h-full w-full"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onChange={onChange} />
            <Recenter lat={latitude} lng={longitude} />
            {hasPosition && (
                <CircleMarker
                    center={[latitude, longitude]}
                    radius={10}
                    pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.8 }}
                />
            )}
        </MapContainer>
    );
}