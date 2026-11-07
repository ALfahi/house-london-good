import { ScenarioPanel } from "@/components/dashboard/ScenarioPanel";
import { HistoryChart } from "@/components/dashboard/HistoryChart";
import { VacancyCountChart } from "@/components/dashboard/VacancyCountChart";
import type { AreaDetail, AreaSummary } from "@/types/api";

const socioeconomicFeatures = [
  ["Overall IMD", "imd_average_score"],
  ["Income", "income_deprivation_score"],
  ["Employment", "employment_deprivation_score"],
  ["Education", "education_deprivation_score"],
  ["Health", "health_deprivation_score"],
  ["Crime", "crime_deprivation_score"],
  ["Housing barriers", "housing_services_barriers_score"],
  ["Living environment", "living_environment_score"],
] as const satisfies ReadonlyArray<readonly [string, keyof AreaSummary]>;

function signedPercentage(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)} pp`;
}

export function AreaPanel({
  area,
  isLoading = false,
  londonAverageRate,
}: {
  area: AreaDetail | AreaSummary | null;
  isLoading?: boolean;
  londonAverageRate?: number;
}) {
  if (!area) {
    return (
      <section className="panel empty-selection">
        <span className="eyebrow">Borough detail</span>
        <h2>Select a borough</h2>
        <p>Choose a borough on the map or comparison chart to inspect its vacancy and socioeconomic profile.</p>
      </section>
    );
  }

  const differenceFromLondon = "difference_from_london" in area
    ? area.difference_from_london
    : londonAverageRate == null
      ? null
      : area.vacancy_rate - londonAverageRate;

  return (
    <section className="panel area-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Selected borough</span>
          <h2>{area.area_name}</h2>
        </div>
        <span className="area-code">{area.area_id}</span>
      </div>
      <p className="area-location">{area.geography} · {area.year}</p>
      <div className="area-stat-grid">
        <div><span>Vacant homes</span><strong>{area.vacant_homes.toLocaleString()}</strong></div>
        <div><span>Vacancy rate</span><strong>{area.vacancy_rate.toFixed(2)}%</strong></div>
        <div><span>Housing stock</span><strong>{area.housing_stock.toLocaleString()}</strong></div>
        <div>
          <span>vs London</span>
          <strong className={(differenceFromLondon ?? 0) > 0 ? "difference-high" : "difference-low"}>
            {differenceFromLondon == null ? "—" : signedPercentage(differenceFromLondon)}
          </strong>
        </div>
      </div>

      <ScenarioPanel key={`${area.area_id}-${area.year}`} area={area} />

      {area.imd_average_score != null && (
        <div className="socioeconomic-block">
          <div className="subsection-heading">
            <div><span className="eyebrow">2025 socioeconomic profile</span><h3>Deprivation domain scores</h3></div>
            <span>Read-only · higher = more deprived</span>
          </div>
          <div className="socioeconomic-grid">
            {socioeconomicFeatures.map(([label, key]) => (
              <div key={key}>
                <span>{label}</span>
                <strong>{typeof area[key] === "number" ? Number(area[key]).toFixed(2) : "—"}</strong>
              </div>
            ))}
          </div>
          <p className="socioeconomic-rank">
            Overall national local-authority rank <strong>{area.imd_rank_average_score?.toLocaleString() ?? "—"}</strong>
          </p>
        </div>
      )}

      {"history" in area ? (
        <>
          <div className="chart-heading">
            <div>
              <span className="eyebrow">Annual history</span>
              <h3>{area.vacancy_count_history.length > 1 ? "Vacant dwellings" : "Vacancy rate"}</h3>
            </div>
            <span>
              {area.vacancy_count_history.length > 1
                ? `${area.vacancy_count_history.length} observations`
                : `${area.history.length} observation`}
            </span>
          </div>
          {area.vacancy_count_history.length > 1 ? (
            <VacancyCountChart history={area.vacancy_count_history} />
          ) : (
            <HistoryChart history={area.history} />
          )}
        </>
      ) : isLoading ? (
        <div className="detail-loading"><i />Loading annual history…</div>
      ) : null}
    </section>
  );
}

