"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import type { AreaSummary } from "@/types/api";

const FEATURES = [
  { key: "imd_average_score", label: "Overall deprivation", shortLabel: "Overall IMD" },
  { key: "income_deprivation_score", label: "Income deprivation", shortLabel: "Income" },
  { key: "employment_deprivation_score", label: "Employment deprivation", shortLabel: "Employment" },
  { key: "education_deprivation_score", label: "Education, skills and training", shortLabel: "Education" },
  { key: "health_deprivation_score", label: "Health and disability deprivation", shortLabel: "Health" },
  { key: "crime_deprivation_score", label: "Crime deprivation", shortLabel: "Crime" },
  { key: "housing_services_barriers_score", label: "Barriers to housing and services", shortLabel: "Housing barriers" },
  { key: "living_environment_score", label: "Living environment deprivation", shortLabel: "Living environment" },
] as const;

type FeatureKey = (typeof FEATURES)[number]["key"];

interface ChartPoint {
  area_id: string;
  area_name: string;
  featureValue: number;
  vacancyRate: number;
}

interface FitLine {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

function clipLineToMinimum(line: FitLine | null, minimum: number): FitLine | null {
  if (!line) return null;
  if (line.start.y < minimum && line.end.y < minimum) return null;
  if (line.start.y >= minimum && line.end.y >= minimum) return line;

  const ratio = (minimum - line.start.y) / (line.end.y - line.start.y);
  const crossing = {
    x: line.start.x + ratio * (line.end.x - line.start.x),
    y: minimum,
  };
  return line.start.y < minimum
    ? { start: crossing, end: line.end }
    : { start: line.start, end: crossing };
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function theilSenLine(points: ChartPoint[]): FitLine | null {
  if (points.length < 2) return null;
  const slopes: number[] = [];

  for (let left = 0; left < points.length - 1; left += 1) {
    for (let right = left + 1; right < points.length; right += 1) {
      const xDifference = points[right].vacancyRate - points[left].vacancyRate;
      if (xDifference !== 0) {
        slopes.push((points[right].featureValue - points[left].featureValue) / xDifference);
      }
    }
  }

  const slope = median(slopes);
  if (slope == null) return null;
  const intercept = median(
    points.map((point) => point.featureValue - slope * point.vacancyRate),
  );
  if (intercept == null) return null;

  const vacancyRates = points.map((point) => point.vacancyRate);
  const minimumVacancy = Math.min(...vacancyRates);
  const maximumVacancy = Math.max(...vacancyRates);
  return {
    start: { x: minimumVacancy, y: intercept + slope * minimumVacancy },
    end: { x: maximumVacancy, y: intercept + slope * maximumVacancy },
  };
}

function correlation(points: ChartPoint[]) {
  if (points.length < 2) return null;
  const meanX = points.reduce((sum, point) => sum + point.featureValue, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.vacancyRate, 0) / points.length;
  const numerator = points.reduce(
    (sum, point) => sum + (point.featureValue - meanX) * (point.vacancyRate - meanY),
    0,
  );
  const xSpread = Math.sqrt(
    points.reduce((sum, point) => sum + (point.featureValue - meanX) ** 2, 0),
  );
  const ySpread = Math.sqrt(
    points.reduce((sum, point) => sum + (point.vacancyRate - meanY) ** 2, 0),
  );
  return xSpread && ySpread ? numerator / (xSpread * ySpread) : null;
}

export function SocioeconomicChart({
  areas,
  selectedAreaId,
  onSelectArea,
}: {
  areas: AreaSummary[];
  selectedAreaId: string | null;
  onSelectArea: (areaId: string) => void;
}) {
  const [featureKey, setFeatureKey] = useState<FeatureKey>("imd_average_score");
  const feature = FEATURES.find((option) => option.key === featureKey) ?? FEATURES[0];
  const points = useMemo(
    () =>
      areas.flatMap((area) => {
        const featureValue = area[featureKey];
        return typeof featureValue === "number" && Number.isFinite(featureValue)
          ? [{
              area_id: area.area_id,
              area_name: area.area_name,
              featureValue,
              vacancyRate: area.vacancy_rate,
            }]
          : [];
      }),
    [areas, featureKey],
  );
  const r = correlation(points);
  const fitLine = useMemo(() => theilSenLine(points), [points]);
  const hasNegativeScores = points.some((point) => point.featureValue < 0);
  const visibleFitLine = hasNegativeScores ? fitLine : clipLineToMinimum(fitLine, 0);
  const yDomain = useMemo((): [number, number] => {
    if (!points.length) return [0, 1];
    const values = points.map((point) => point.featureValue);
    if (visibleFitLine) values.push(visibleFitLine.start.y, visibleFitLine.end.y);
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const padding = Math.max((maximum - minimum) * 0.08, 0.05);
    return [minimum < 0 ? minimum - padding : 0, maximum + padding];
  }, [points, visibleFitLine]);

  return (
    <section className="comparison-section" aria-labelledby="comparison-title">
      <div className="comparison-heading">
        <div>
          <span className="eyebrow">Compare all boroughs</span>
          <h2 id="comparison-title">Vacancy against socioeconomic conditions</h2>
          <p>Each point is a London borough. Select one to update its detail panel.</p>
        </div>
        <label className="feature-control" htmlFor="socioeconomic-feature">
          <span>Socioeconomic feature</span>
          <select
            id="socioeconomic-feature"
            value={featureKey}
            onChange={(event) => setFeatureKey(event.target.value as FeatureKey)}
          >
            {FEATURES.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {points.length ? (
        <>
          <div className="comparison-meta">
            <span><i className="point-key" />{points.length} boroughs</span>
            {visibleFitLine && <span><i className="fit-key" />Theil–Sen fit</span>}
            {r != null && <span>Correlation <strong>r = {r.toFixed(2)}</strong></span>}
            {hasNegativeScores && (
              <span className="score-note">Standardised score · negative values are valid</span>
            )}
          </div>
          <div className="comparison-chart" aria-label={`${feature.label} by vacancy rate scatter chart with Theil–Sen fit`}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 18, bottom: 34, left: 8 }}>
                <CartesianGrid stroke="#dfe7e4" strokeDasharray="3 4" />
                <XAxis
                  type="number"
                  dataKey="vacancyRate"
                  name="Vacancy rate"
                  domain={["auto", "auto"]}
                  tick={{ fill: "#61706c", fontSize: 11 }}
                  tickFormatter={(value: number) => `${Number(value.toFixed(2))}%`}
                  tickLine={false}
                  axisLine={{ stroke: "#bfcfca" }}
                  label={{ value: "Vacancy rate", position: "bottom", offset: 14, fill: "#435854", fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="featureValue"
                  name={feature.label}
                  domain={yDomain}
                  allowDataOverflow
                  width={88}
                  tickCount={6}
                  tickFormatter={(value: number) => (Math.abs(value) < 0.005 ? 0 : value).toFixed(2)}
                  tickMargin={8}
                  tick={{ fill: "#435854", fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "#bfcfca" }}
                  label={{ value: `${feature.shortLabel} score`, angle: -90, position: "insideLeft", offset: 0, fill: "#435854", fontSize: 11 }}
                />
                <ZAxis range={[90, 90]} />
                {hasNegativeScores && (
                  <ReferenceLine y={0} stroke="#9aa9a5" strokeWidth={1} />
                )}
                {visibleFitLine && (
                  <ReferenceLine
                    segment={[visibleFitLine.start, visibleFitLine.end]}
                    stroke="#d97706"
                    strokeWidth={2.5}
                    strokeDasharray="7 5"
                  />
                )}
                <Tooltip
                  cursor={{ stroke: "#91aaa4", strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload as ChartPoint | undefined;
                    if (!active || !point) return null;
                    return (
                      <div className="comparison-tooltip">
                        <strong>{point.area_name}</strong>
                        <span>Vacancy: {point.vacancyRate.toFixed(2)}%</span>
                        <span>{feature.shortLabel}: {point.featureValue.toFixed(2)}</span>
                        <small>Click to view borough</small>
                      </div>
                    );
                  }}
                />
                <Scatter data={points}>
                  {points.map((point) => (
                    <Cell
                      key={point.area_id}
                      fill={point.area_id === selectedAreaId ? "#f4a261" : "#087f73"}
                      stroke={point.area_id === selectedAreaId ? "#102d29" : "#ffffff"}
                      strokeWidth={point.area_id === selectedAreaId ? 3 : 1.5}
                      cursor="pointer"
                      onClick={() => onSelectArea(point.area_id)}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="comparison-empty">
          Socioeconomic scores are unavailable for this dataset and year.
        </div>
      )}
    </section>
  );
}
