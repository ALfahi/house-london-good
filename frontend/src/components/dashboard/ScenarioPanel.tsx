"use client";

import { useState } from "react";
import snapshot from "@/data/borough-scenarios.json";
import { predictCombinedVacancy, sliderBounds } from "@/lib/scenarios";
import type { AreaSummary } from "@/types/api";

type FactorKey = keyof typeof snapshot.models;
const factors: { key: FactorKey; label: string; unit: string; date: string; step: number; percent?: boolean }[] = [
  { key: "house_price_gbp", label: "Average house price", unit: "£", date: "UK HPI · October 2025", step: 1000 },
  { key: "average_age", label: "Average age", unit: "years", date: "Census 2021 · approximate mean age", step: 0.1 },
  { key: "population_density", label: "Population density", unit: "residents/km²", date: "Census 2021", step: 10 },
  { key: "unemployment_pct", label: "Unemployment", unit: "%", date: "Census 2021 · economically active residents aged 16+", step: 0.1, percent: true },
  { key: "degree_level_pct", label: "Degree-level qualifications", unit: "%", date: "Census 2021 · Level 4+ among residents aged 16+", step: 0.1, percent: true },
  { key: "private_rented_pct", label: "Private renting", unit: "%", date: "Census 2021 · households", step: 0.1, percent: true },
  { key: "overcrowded_pct", label: "Overcrowding", unit: "%", date: "Census 2021 · households with too few bedrooms", step: 0.1, percent: true },
  { key: "flat_households_pct", label: "Flats / maisonettes", unit: "%", date: "Census 2021 · households", step: 0.1, percent: true },
  { key: "median_taxpayer_income_gbp", label: "Median taxpayer income", unit: "£", date: "HMRC 2021–22 · annual personal income", step: 100 },
  { key: "crime_per_1000_2021", label: "Recorded crime", unit: "offences/1,000 residents", date: "MPS 2021 · Census population denominator", step: 1 },
  { key: "transport_access_index_2015", label: "Transport accessibility", unit: "PTAI", date: "TfL 2015 · historical numerical index", step: 0.1 },
];

function format(value: number, unit: string) {
  return unit === "£"
    ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value)
    : `${value.toLocaleString("en-GB", { maximumFractionDigits: 1 })}${unit === "%" ? "%" : ` ${unit}`}`;
}

export function ScenarioPanel({ area }: { area: AreaSummary }) {
  const [values, setValues] = useState<Partial<Record<FactorKey, number>>>({});
  const baseline = (snapshot.boroughs as Record<string, Partial<Record<FactorKey, number | null>>>)[area.area_id];
  if (area.is_synthetic || !baseline) return <p className="scenario-note">Borough scenario data is unavailable for this area.</p>;

  const prediction = predictCombinedVacancy(area.vacancy_rate, factors.flatMap((factor) => {
    const initial = baseline[factor.key];
    return initial == null ? [] : [{ initial, final: values[factor.key] ?? initial, slope: snapshot.models[factor.key].slope }];
  }));
  const changedCount = factors.filter((factor) => baseline[factor.key] != null && values[factor.key] != null && values[factor.key] !== baseline[factor.key]).length;

  return (
    <section className="scenario-panel" aria-label={`${area.area_name} vacancy scenarios`}>
      <div className="subsection-heading">
        <div><span className="eyebrow">Explore a change</span><h3>Vacancy scenarios</h3></div>
        <button type="button" className="scenario-reset" onClick={() => setValues({})}>Reset all</button>
      </div>
      <p className="scenario-note"><strong>{area.area_name}</strong> · Starting vacancy <strong>{area.vacancy_rate.toFixed(2)}%</strong> ({area.year})</p>
      <output className="scenario-result scenario-combined" aria-live="polite" aria-label="Combined predicted vacancy">
        <span>Combined predicted vacancy</span><strong>{prediction?.feasible ? `${prediction.raw.toFixed(2)}%` : "Outside valid range"}</strong>
        {prediction && <small>{prediction.feasible ? `${prediction.change >= 0 ? "+" : ""}${prediction.change.toFixed(2)} percentage points · ${changedCount} factor${changedCount === 1 ? "" : "s"} changed` : `Linear result: ${prediction.raw.toFixed(2)}%; vacancy must be 0–100%.`}</small>}
      </output>
      <div className="scenario-factors">
        {factors.map((factor) => {
          const initial = baseline[factor.key];
          const model = snapshot.models[factor.key];
          const id = `scenario-${area.area_id}-${factor.key}`;
          if (initial == null || !Number.isFinite(initial)) return (
            <div key={factor.key} className="scenario-factor scenario-unavailable"><h4>{factor.label}</h4><span className="scenario-note">{factor.key === "crime_per_1000_2021" ? "City of London is outside the MPS dataset." : "Slider unavailable."}</span></div>
          );
          const value = values[factor.key] ?? initial;
          const bounds = sliderBounds(initial, model.min, model.max, Boolean(factor.percent));
          const extrapolated = value < model.min || value > model.max;
          return (
            <div key={factor.key} className="scenario-factor">
              <div className="scenario-factor-heading" title={`${factor.date} · Observed: ${format(initial, factor.unit)}`}>
                <label htmlFor={id}>{factor.label}</label>
                <span className="scenario-current">{format(value, factor.unit)}</span>
              </div>
              <input id={id} type="range" min={bounds.min} max={bounds.max} step="any" value={value} aria-valuetext={format(value, factor.unit)} onChange={(event) => setValues((previous) => ({ ...previous, [factor.key]: Number(event.target.value) }))} />
              {extrapolated && <p className="scenario-warning">Outside observed range</p>}

            </div>
          );
        })}
      </div>
      <details className="scenario-method"><summary>Data and calculation notes</summary><p className="scenario-note">Illustrative additive scenario: starting vacancy + the sum of each slope × factor change. This is not a jointly fitted forecast. Socioeconomic coefficients use 2021 borough fits. House price uses the agreed inverse constituency slope, 1 / £39,778.19. No socioeconomic factor survives adjustment for ten comparisons. The combined calculation adds marginal associations and can double-count related factors.</p><ul className="scenario-source-list">{factors.map((factor) => <li key={factor.key}><strong>{factor.label}</strong>: {factor.date}{baseline[factor.key] != null ? ` · observed ${format(baseline[factor.key]!, factor.unit)}` : " · unavailable"}</li>)}</ul></details>
    </section>
  );
}
