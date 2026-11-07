"use client";

import type { Feature, Geometry } from "geojson";
import type { Layer, LeafletMouseEvent, PathOptions } from "leaflet";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";

import { Legend } from "@/components/map/Legend";
import type { VacancyGeoJSON, VacancyProperties } from "@/types/api";

interface MapViewProps {
  data: VacancyGeoJSON;
  selectedAreaId: string | null;
  onSelectArea: (areaId: string) => void;
  geographySource: string;
}

function vacancyColour(rate: number) {
  if (rate > 3) return "#084c47";
  if (rate > 2.5) return "#167a73";
  if (rate > 2) return "#48a99e";
  if (rate > 1.5) return "#91d1c8";
  return "#d9f0ed";
}

export default function MapView({ data, selectedAreaId, onSelectArea, geographySource }: MapViewProps) {
  const style = (feature?: Feature<Geometry, VacancyProperties>): PathOptions => {
    const selected = feature?.properties.area_id === selectedAreaId;
    return {
      fillColor: vacancyColour(feature?.properties.vacancy_rate ?? 0),
      color: selected ? "#f4a261" : "#ffffff",
      weight: selected ? 3 : 1.2,
      opacity: 1,
      fillOpacity: selected ? 0.92 : 0.78,
    };
  };

  const onEachFeature = (feature: Feature<Geometry, VacancyProperties>, layer: Layer) => {
    const properties = feature.properties;
    layer.bindTooltip(
      `<strong>${properties.area_name}</strong><br/>${properties.vacancy_rate.toFixed(2)}% · ${properties.vacant_homes.toLocaleString()} vacant<br/><small>Click for borough details</small>`,
      { sticky: true, direction: "top", className: "vacancy-tooltip" },
    );
    layer.on({
      mouseover: (event: LeafletMouseEvent) => event.target.setStyle({ weight: 3, color: "#f4a261", fillOpacity: 0.92 }),
      mouseout: (event: LeafletMouseEvent) => event.target.setStyle(style(feature)),
      click: () => onSelectArea(properties.area_id),
    });
  };

  return (
    <div className="map-shell">
      <MapContainer center={[51.525, -0.12]} zoom={10} minZoom={9} className="map-container" zoomControl>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          key={`${data.features[0]?.properties.year ?? "empty"}-${selectedAreaId ?? "none"}`}
          data={data}
          style={style}
          onEachFeature={onEachFeature}
        />
      </MapContainer>
      <Legend />
      <div className="map-source">{geographySource}</div>
    </div>
  );
}

