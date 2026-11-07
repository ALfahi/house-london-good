"use client";

import { useEffect, useState } from "react";

import { AreaPanel } from "@/components/dashboard/AreaPanel";
import { SocioeconomicChart } from "@/components/dashboard/SocioeconomicChart";
import { DynamicMap } from "@/components/map/DynamicMap";
import { MetricCard } from "@/components/ui/MetricCard";
import { useVacancyData } from "@/hooks/use-vacancy-data";

export default function HomePage() {
  const [year, setYear] = useState<number | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const {
    status,
    areas,
    geojson,
    selectedArea,
    error,
    loading,
    reload,
  } = useVacancyData(year, selectedAreaId);

  useEffect(() => {
    if (status && year === null) setYear(Math.max(...status.available_years));
  }, [status, year]);

  const isDemo = status?.is_synthetic ?? true;
  const summary = areas?.summary;
  const selectedAreaSummary = areas?.items.find((area) => area.area_id === selectedAreaId) ?? null;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-group">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
          <div>
            <p className="project-kicker">House London · Data explorer</p>
            <h1>London Vacancy Explorer</h1>
          </div>
        </div>
      </header>

      {isDemo && status && (
        <div className="demo-banner" role="status">
          <strong>Demonstration mode</strong>
          <span>Synthetic values and generalised geometry are shown—never use them as housing evidence.</span>
        </div>
      )}

      <div className="dashboard-grid">
        <section className="map-column" aria-label="Borough vacancy explorer">
          <div className="map-toolbar">
            <div>
              <span className="eyebrow">Explore the capital</span>
              <h2>Borough vacancy, {year ?? "—"}</h2>
            </div>

          </div>
          <div className="map-stage">
            {error ? (
              <div className="state-card error-state">
                <span>Unable to load the explorer</span><p>{error}</p><button onClick={reload}>Try again</button>
              </div>
            ) : loading || !geojson ? (
              <div className="state-card loading-state"><i /><span>Loading borough data…</span></div>
            ) : (
              <DynamicMap
                data={geojson}
                selectedAreaId={selectedAreaId}
                onSelectArea={setSelectedAreaId}
                geographySource={status?.geography_source ?? "Boundary source unavailable"}
              />
            )}
          </div>
          <SocioeconomicChart
            areas={areas?.items ?? []}
            selectedAreaId={selectedAreaId}
            onSelectArea={setSelectedAreaId}
          />
        </section>

        <aside className="sidebar">
          <section className="metrics-grid" aria-label="London summary">
            <MetricCard label="Vacant homes" value={summary?.total_vacant_homes.toLocaleString() ?? "—"} note={`Across ${summary?.area_count ?? 0} areas`} accent="teal" />
            <MetricCard label="Average rate" value={summary ? `${summary.average_vacancy_rate.toFixed(2)}%` : "—"} note="Stock-weighted London rate" accent="amber" />
          </section>

          <AreaPanel
            area={selectedArea ?? selectedAreaSummary}
            isLoading={Boolean(selectedAreaId && !selectedArea)}
            londonAverageRate={summary?.average_vacancy_rate}
          />


          <section className="data-footnote">
            <span className="status-dot" />
            <p><strong>{status?.connection_state.replaceAll("_", " ") ?? "Checking source"}</strong>{status?.message}</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
