import type { FeatureCollection, Geometry } from "geojson";

export interface AreaSummary {
  area_id: string;
  area_name: string;
  geography: string;
  borough: string;
  year: number;
  vacant_homes: number;
  housing_stock: number;
  vacancy_rate: number;
  source: string;
  is_synthetic: boolean;
  imd_average_score?: number | null;
  imd_rank_average_score?: number | null;
  imd_most_deprived_10pct?: number | null;
  income_deprivation_score?: number | null;
  employment_deprivation_score?: number | null;
  education_deprivation_score?: number | null;
  health_deprivation_score?: number | null;
  crime_deprivation_score?: number | null;
  housing_services_barriers_score?: number | null;
  living_environment_score?: number | null;
}

export interface HistoryPoint {
  year: number;
  vacant_homes: number;
  housing_stock: number;
  vacancy_rate: number;
}

export interface VacancyCountPoint {
  year: number;
  vacant_homes: number;
}

export interface AreaDetail extends AreaSummary {
  history: HistoryPoint[];
  vacancy_count_history: VacancyCountPoint[];
  london_average_rate: number;
  difference_from_london: number;
}

export interface AreaSummaryStats {
  year: number;
  total_vacant_homes: number;
  total_housing_stock: number;
  average_vacancy_rate: number;
  area_count: number;
}

export interface AreasResponse {
  items: AreaSummary[];
  summary: AreaSummaryStats;
}

export interface DataStatus {
  source: string;
  connection_state: string;
  available_years: number[];
  is_synthetic: boolean;
  record_count: number;
  constituency_record_count: number;
  geography_source: string;
  load_error: string | null;
  constituency_load_error: string | null;
  message: string;
}

export interface ConstituencyMarketRecord {
  constituency: string;
  ons_code: string;
  empty_homes_pct: number;
  vacant_homes_count: number;
  long_term_empty_homes_count: number;
  long_term_empty_pct: number;
  empty_homes_premium_count: number;
  homes_on_council_tax_list: number;
  house_price_gbp: number;
  house_price_1y_change_pct: number;
  house_price_5y_change_pct: number;
  price_to_earnings_ratio: number | null;
  vacant_per_1000_homes: number;
}

export interface ConstituencyMarketSummary {
  constituency_count: number;
  estimated_vacant_homes: number;
  estimated_long_term_empty_homes: number;
  estimated_homes_on_council_tax_list: number;
  average_empty_homes_pct: number;
  median_house_price_gbp: number;
}

export interface ConstituenciesResponse {
  items: ConstituencyMarketRecord[];
  summary: ConstituencyMarketSummary;
}

export interface ModelStatus {
  available: boolean;
  trained: boolean;
  metrics: Record<string, unknown> | null;
  message: string;
}

export type VacancyProperties = AreaSummary & { area_id: string };
export type VacancyGeoJSON = FeatureCollection<Geometry, VacancyProperties>;

