import type {
  AreaDetail,
  AreasResponse,
  ConstituenciesResponse,
  DataStatus,
  ModelStatus,
  VacancyGeoJSON,
} from "@/types/api";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000")
).replace(/\/$/, "");

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { signal, cache: "no-store" });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  status: (signal?: AbortSignal) => request<DataStatus>("/api/data/status", signal),
  modelStatus: (signal?: AbortSignal) => request<ModelStatus>("/api/model/status", signal),
  constituencies: (signal?: AbortSignal) =>
    request<ConstituenciesResponse>("/api/constituencies", signal),
  areas: (year: number, signal?: AbortSignal) =>
    request<AreasResponse>(`/api/areas?year=${year}`, signal),
  geojson: (year: number, signal?: AbortSignal) =>
    request<VacancyGeoJSON>(`/api/geojson?year=${year}`, signal),
  area: (areaId: string, year: number, signal?: AbortSignal) =>
    request<AreaDetail>(`/api/areas/${encodeURIComponent(areaId)}?year=${year}`, signal),
};

