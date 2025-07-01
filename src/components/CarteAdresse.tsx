import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  lat: number | null;
  lon: number | null;
  label?: string;
};

export default function CarteAdresse({ lat, lon, label }: Props) {
  if (!lat || !lon) return null;
  return (
    <div style={{ margin: "1.2em 0", borderRadius: 8, overflow: "hidden", border: "1px solid #D2D2D2" }}>
      <MapContainer center={[lat, lon]} zoom={16} style={{ height: 220, width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lon]}>
          <Popup>{label || "Adresse de l’établissement"}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
