"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type {
  AreaDetail,
  AreasResponse,
  DataStatus,
  VacancyGeoJSON,
} from "@/types/api";

export function useVacancyData(year: number | null, selectedAreaId: string | null) {
  const [status, setStatus] = useState<DataStatus | null>(null);
  const [areas, setAreas] = useState<AreasResponse | null>(null);
  const [geojson, setGeojson] = useState<VacancyGeoJSON | null>(null);
  const [selectedArea, setSelectedArea] = useState<AreaDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    api.status(controller.signal)
      .then((nextStatus) => {
        setStatus(nextStatus);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "API unavailable");
      });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (year === null) return;
    const controller = new AbortController();
    setLoading(true);
    Promise.all([api.areas(year, controller.signal), api.geojson(year, controller.signal)])
      .then(([nextAreas, nextGeojson]) => {
        setAreas(nextAreas);
        setGeojson(nextGeojson);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to load data");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [year, revision]);

  useEffect(() => {
    if (!selectedAreaId || year === null) {
      setSelectedArea(null);
      return;
    }
    const controller = new AbortController();
    setSelectedArea(null);
    api.area(selectedAreaId, year, controller.signal)
      .then(setSelectedArea)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to load area");
      });
    return () => controller.abort();
  }, [selectedAreaId, year, revision]);

  return {
    status,
    areas,
    geojson,
    selectedArea,
    error,
    loading,
    reload,
  };
}

