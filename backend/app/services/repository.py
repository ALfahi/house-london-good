from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from app.config import settings
from app.services.data_processing import load_snapshot, normalise_dataset
from app.services.geography import attach_statistics, feature_collection, rectangle_feature
from app.services.local_data import (
    BOUNDARY_SOURCE,
    CONSTITUENCY_MARKET_FILE,
    CONSTITUENCY_MARKET_SOURCE,
    SOURCE_NAME,
    bundled_files_available,
    load_constituency_market_data,
    load_london_borough_data,
)

DEMO_AREAS = [
    ("DEMO-001", "Demo area 01", "West London", -0.42, 51.43),
    ("DEMO-002", "Demo area 02", "West London", -0.28, 51.43),
    ("DEMO-003", "Demo area 03", "Central London", -0.14, 51.43),
    ("DEMO-004", "Demo area 04", "East London", 0.00, 51.43),
    ("DEMO-005", "Demo area 05", "West London", -0.42, 51.53),
    ("DEMO-006", "Demo area 06", "Central London", -0.28, 51.53),
    ("DEMO-007", "Demo area 07", "Central London", -0.14, 51.53),
    ("DEMO-008", "Demo area 08", "East London", 0.00, 51.53),
    ("DEMO-009", "Demo area 09", "North London", -0.42, 51.63),
    ("DEMO-010", "Demo area 10", "North London", -0.28, 51.63),
    ("DEMO-011", "Demo area 11", "North London", -0.14, 51.63),
    ("DEMO-012", "Demo area 12", "East London", 0.00, 51.63),
]


def _demo_frame() -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    for index, (area_id, name, borough, _, _) in enumerate(DEMO_AREAS):
        stock = 3_200 + index * 173
        base_rate = 1.15 + (index % 5) * 0.58 + (index // 4) * 0.16
        for year_index, year in enumerate((2022, 2023, 2024)):
            rate = base_rate + (-0.16, 0.07, 0.20)[year_index] + ((index % 3) - 1) * 0.04
            rows.append({
                "area_id": area_id,
                "area_name": name,
                "borough": borough,
                "year": year,
                "vacant_homes": round(stock * rate / 100),
                "housing_stock": stock,
            })
    return normalise_dataset(
        pd.DataFrame(rows), source="Synthetic demonstration data", is_synthetic=True
    ).assign(geography="Demonstration grid")


def _demo_boundaries() -> dict[str, Any]:
    features = []
    for area_id, _, _, west, south in DEMO_AREAS:
        features.append(
            rectangle_feature(
                area_id=area_id,
                west=west,
                south=south,
                east=west + 0.135,
                north=south + 0.095,
            )
        )
    return feature_collection(features)


class VacancyRepository:
    def __init__(self, snapshot_path: str | None = None) -> None:
        configured = snapshot_path or settings.data_snapshot_path
        self.boundaries = _demo_boundaries()
        self.boundary_source = "Generalised demonstration grid (not administrative boundaries)"
        self.load_error: str | None = None
        self.constituency_load_error: str | None = None
        self.dataset_mode = "demo"
        self.count_history: dict[str, list[dict[str, int]]] = {}
        self.constituency_frame = pd.DataFrame()
        constituency_path = settings.data_dir / CONSTITUENCY_MARKET_FILE
        if constituency_path.exists():
            try:
                self.constituency_frame = load_constituency_market_data(settings.data_dir)
            except Exception as exc:  # noqa: BLE001 - invalid bundled data must fail closed
                self.constituency_load_error = str(exc)
        if configured:
            try:
                self.frame = load_snapshot(Path(configured), source=f"Snapshot: {Path(configured).name}")
                self.is_synthetic = False
                self.source = f"Local authorised snapshot: {Path(configured).name}"
                self.dataset_mode = "snapshot"
                self._load_matching_boundaries(Path(configured))
            except Exception as exc:  # noqa: BLE001 - any invalid user snapshot must fail closed
                self.load_error = str(exc)
                self.frame = _demo_frame()
                self.is_synthetic = True
                self.source = "Synthetic demonstration data"
        elif bundled_files_available(settings.data_dir):
            try:
                self.frame, self.boundaries, self.count_history = load_london_borough_data(
                    settings.data_dir
                )
                self.is_synthetic = False
                self.source = SOURCE_NAME
                self.boundary_source = BOUNDARY_SOURCE
                self.dataset_mode = "bundled_official"
            except Exception as exc:  # noqa: BLE001 - invalid source files must fail closed
                self.load_error = str(exc)
                self.frame = _demo_frame()
                self.is_synthetic = True
                self.source = "Synthetic demonstration data"
        else:
            self.frame = _demo_frame()
            self.is_synthetic = True
            self.source = "Synthetic demonstration data"

    def _load_matching_boundaries(self, snapshot: Path) -> None:
        candidates = [
            snapshot.with_suffix(".geojson"),
            snapshot.parent / f"{snapshot.stem}_boundaries.geojson",
        ]
        for candidate in candidates:
            if candidate.exists():
                self.boundaries = json.loads(candidate.read_text(encoding="utf-8"))
                self.boundary_source = f"Local boundary snapshot: {candidate.name}"
                return

    @property
    def years(self) -> list[int]:
        return sorted(self.frame["year"].unique().astype(int).tolist())

    def status(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "connection_state": self.dataset_mode if not self.is_synthetic else "demo_fallback",
            "available_years": self.years,
            "is_synthetic": self.is_synthetic,
            "record_count": len(self.frame),
            "constituency_record_count": len(self.constituency_frame),
            "geography_source": self.boundary_source,
            "load_error": self.load_error,
            "constituency_load_error": self.constituency_load_error,
            "message": (
                "Showing synthetic demonstration data because the bundled source files could not be loaded."
                if self.is_synthetic
                else "Serving processed local source files; API requests do not re-read the workbooks."
            ),
        }

    def metadata(self) -> list[dict[str, Any]]:
        datasets = [{
            "id": "vacant-homes",
            "name": "All vacant dwellings by London borough",
            "description": (
                "Synthetic values for interface demonstration only."
                if self.is_synthetic
                else "All vacant dwellings divided by total dwellings on the council-tax valuation list."
            ),
            "source": self.source,
            "geography": str(self.frame["geography"].iloc[0]),
            "years": self.years,
            "units": {"vacant_homes": "dwellings", "housing_stock": "dwellings", "vacancy_rate": "percent"},
            "definitions": {
                "vacancy_rate": "100 × vacant homes ÷ total housing stock",
                "vacant_homes": (
                    "Synthetic count"
                    if self.is_synthetic
                    else "All vacant dwellings at 6 October 2025, as published in Live Table 615"
                ),
                "housing_stock": (
                    "Synthetic denominator"
                    if self.is_synthetic
                    else "Total dwellings on the valuation list in the 2025 Council Taxbase workbook"
                ),
            },
            "is_synthetic": self.is_synthetic,
            "licence": (
                "Demonstration data generated for this project"
                if self.is_synthetic
                else "UK government data; source workbooks and ONS boundaries supplied under their published terms/OGL v3.0"
            ),
        }]
        if self.dataset_mode == "bundled_official":
            datasets.append({
                "id": "index-of-multiple-deprivation-2025",
                "name": "Index of Multiple Deprivation 2025 borough context",
                "description": "Local-authority summary indicators joined by 2024 LAD code.",
                "source": "MHCLG English Indices of Deprivation 2025",
                "geography": "London borough",
                "years": [2025],
                "units": {
                    "imd_average_score": "index score",
                    "imd_rank_average_score": "national local-authority rank",
                    "imd_most_deprived_10pct": "proportion",
                    "income_deprivation_score": "domain score",
                    "employment_deprivation_score": "domain score",
                    "education_deprivation_score": "domain score",
                    "health_deprivation_score": "domain score",
                    "crime_deprivation_score": "domain score",
                    "housing_services_barriers_score": "domain score",
                    "living_environment_score": "domain score",
                },
                "definitions": {
                    "imd_average_score": "Population-weighted average of LSOA IMD scores",
                    "imd_rank_average_score": "Rank of average score; 1 is most deprived",
                    "domain_scores": (
                        "Population-weighted borough averages for the seven IMD domains; "
                        "higher scores indicate greater deprivation within each domain"
                    ),
                },
                "is_synthetic": False,
                "licence": "UK government data under its published terms/OGL v3.0",
            })
        if not self.constituency_frame.empty:
            datasets.append({
                "id": "empty-homes-house-prices-by-constituency",
                "name": "Empty homes and house prices by London constituency",
                "description": (
                    "A bundled constituency snapshot combining apportioned empty-home "
                    "estimates with house-price and affordability indicators. The source "
                    "file does not specify an observation date."
                ),
                "source": CONSTITUENCY_MARKET_SOURCE,
                "geography": "UK parliamentary constituency",
                "years": [],
                "units": {
                    "empty_homes_pct": "percent",
                    "vacant_homes_count": "estimated dwellings",
                    "long_term_empty_homes_count": "estimated dwellings",
                    "long_term_empty_pct": "percent",
                    "empty_homes_premium_count": "estimated dwellings",
                    "homes_on_council_tax_list": "estimated dwellings",
                    "house_price_gbp": "GBP",
                    "house_price_1y_change_pct": "percent",
                    "house_price_5y_change_pct": "percent",
                    "price_to_earnings_ratio": "ratio",
                    "vacant_per_1000_homes": "dwellings per 1,000",
                },
                "definitions": {
                    "empty_homes_pct": "Estimated vacant homes as a share of council-tax-list homes",
                    "long_term_empty_pct": "Estimated long-term empty homes as a share of council-tax-list homes",
                    "price_to_earnings_ratio": "House price divided by earnings",
                },
                "is_synthetic": False,
                "licence": "Not specified in the bundled CSV",
            })
        return datasets

    def constituencies(self) -> list[dict[str, Any]]:
        if self.constituency_frame.empty:
            raise KeyError("Constituency market data is unavailable")
        return self.constituency_frame.to_dict(orient="records")

    def constituency(self, ons_code: str) -> dict[str, Any] | None:
        if self.constituency_frame.empty:
            raise KeyError("Constituency market data is unavailable")
        match = self.constituency_frame[
            self.constituency_frame["ons_code"] == ons_code.upper()
        ]
        if match.empty:
            return None
        return match.iloc[0].to_dict()

    def constituency_summary(self) -> dict[str, Any]:
        if self.constituency_frame.empty:
            raise KeyError("Constituency market data is unavailable")
        frame = self.constituency_frame
        total_stock = float(frame["homes_on_council_tax_list"].sum())
        total_vacant = float(frame["vacant_homes_count"].sum())
        return {
            "constituency_count": len(frame),
            "estimated_vacant_homes": round(total_vacant, 3),
            "estimated_long_term_empty_homes": round(
                float(frame["long_term_empty_homes_count"].sum()), 3
            ),
            "estimated_homes_on_council_tax_list": round(total_stock, 3),
            "average_empty_homes_pct": round(100 * total_vacant / total_stock, 4),
            "median_house_price_gbp": int(frame["house_price_gbp"].median()),
        }

    def _for_year(self, year: int | None) -> pd.DataFrame:
        selected = year if year is not None else max(self.years)
        if selected not in self.years:
            raise KeyError(f"Year {selected} is unavailable")
        return self.frame[self.frame["year"] == selected].copy()

    def areas(
        self, *, year: int | None = None, geography: str | None = None, borough: str | None = None
    ) -> list[dict[str, Any]]:
        frame = self._for_year(year)
        if geography:
            frame = frame[frame["geography"].str.casefold() == geography.casefold()]
        if borough:
            frame = frame[frame["borough"].str.casefold() == borough.casefold()]
        return frame.to_dict(orient="records")

    def area(self, area_id: str, *, year: int | None = None) -> dict[str, Any] | None:
        current = self._for_year(year)
        match = current[current["area_id"] == area_id.upper()]
        if match.empty:
            return None
        record = match.iloc[0].to_dict()
        history = self.frame[self.frame["area_id"] == area_id.upper()][
            ["year", "vacant_homes", "housing_stock", "vacancy_rate"]
        ].sort_values("year")
        london_rate = 100 * current["vacant_homes"].sum() / current["housing_stock"].sum()
        record.update({
            "history": history.to_dict(orient="records"),
            "vacancy_count_history": self.count_history.get(area_id.upper(), []),
            "london_average_rate": round(float(london_rate), 3),
            "difference_from_london": round(float(record["vacancy_rate"] - london_rate), 3),
        })
        return record

    def summary(
        self,
        *,
        year: int | None = None,
        geography: str | None = None,
        borough: str | None = None,
    ) -> dict[str, Any]:
        frame = self._for_year(year)
        if geography:
            frame = frame[frame["geography"].str.casefold() == geography.casefold()]
        if borough:
            frame = frame[frame["borough"].str.casefold() == borough.casefold()]
        if frame.empty:
            raise KeyError("No areas match the requested filters")
        total_vacant = int(frame["vacant_homes"].sum())
        total_stock = int(frame["housing_stock"].sum())
        return {
            "year": int(frame["year"].iloc[0]),
            "total_vacant_homes": total_vacant,
            "total_housing_stock": total_stock,
            "average_vacancy_rate": round(100 * total_vacant / total_stock, 3),
            "area_count": len(frame),
        }

    def geojson(self, *, year: int | None = None) -> dict[str, Any]:
        records = {item["area_id"]: item for item in self.areas(year=year)}
        return attach_statistics(self.boundaries, records)


repository = VacancyRepository()

