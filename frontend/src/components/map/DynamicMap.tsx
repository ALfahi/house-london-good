"use client";

import dynamic from "next/dynamic";

import type { VacancyGeoJSON } from "@/types/api";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="map-loading">Preparing the London map…</div>,
});

interface DynamicMapProps {
  data: VacancyGeoJSON;
  selectedAreaId: string | null;
  onSelectArea: (areaId: string) => void;
  geographySource: string;
}

export function DynamicMap(props: DynamicMapProps) {
  return <MapView {...props} />;
}

