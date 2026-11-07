from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import pandas as pd

COLUMN_ALIASES = {
    "area_id": ("area_id", "area_code", "geography_code", "lsoa_code", "msoa_code", "code"),
    "area_name": ("area_name", "geography_name", "lsoa_name", "msoa_name", "name"),
    "year": ("year", "date", "period"),
    "vacant_homes": ("vacant_homes", "vacant", "vacancies", "empty_homes", "count"),
    "housing_stock": ("housing_stock", "dwelling_stock", "total_dwellings", "stock", "denominator"),
    "borough": ("borough", "local_authority", "lad_name"),
}


def _normalise_column_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def identify_columns(frame: pd.DataFrame) -> dict[str, str]:
    normalised = {_normalise_column_name(column): column for column in frame.columns}
    matches: dict[str, str] = {}
    for target, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in normalised:
                matches[target] = normalised[alias]
                break
    return matches


def infer_geography(codes: pd.Series) -> str:
    sample = codes.dropna().astype(str).head(100)
    if sample.empty:
        return "Unknown"
    if sample.str.match(r"^E010\d{5}$").mean() > 0.8:
        return "LSOA"
    if sample.str.match(r"^E020\d{5}$").mean() > 0.8:
        return "MSOA"
    if sample.str.match(r"^E09\d{6}$").mean() > 0.8:
        return "Borough"
    if (
        sample.str.match(r"^UPRN", case=False).mean() > 0.8
        or sample.str.match(r"^\d{10,12}$").mean() > 0.8
    ):
        return "Property"
    return "Unknown"


def inspect_dataset(frame: pd.DataFrame) -> dict[str, Any]:
    columns = identify_columns(frame)
    geography = infer_geography(frame[columns["area_id"]]) if "area_id" in columns else "Unknown"
    return {
        "rows": len(frame),
        "columns": list(frame.columns),
        "column_mapping": columns,
        "geography": geography,
        "missing": frame.isna().sum().to_dict(),
    }


def normalise_dataset(frame: pd.DataFrame, *, source: str, is_synthetic: bool = False) -> pd.DataFrame:
    mapping = identify_columns(frame)
    required = {"area_id", "area_name", "year", "vacant_homes", "housing_stock"}
    missing = required - mapping.keys()
    if missing:
        raise ValueError(f"Dataset is missing required fields: {', '.join(sorted(missing))}")

    result = frame.rename(columns={original: target for target, original in mapping.items()}).copy()
    result["area_id"] = result["area_id"].astype(str).str.strip().str.upper()
    result["area_name"] = result["area_name"].astype(str).str.strip()
    raw_year = result["year"]
    numeric_year = pd.to_numeric(raw_year, errors="coerce")
    numeric_year = numeric_year.where(numeric_year.between(1900, 2100))
    parsed_year = pd.to_datetime(raw_year, errors="coerce").dt.year
    result["year"] = numeric_year.fillna(parsed_year)
    result["vacant_homes"] = pd.to_numeric(result["vacant_homes"], errors="coerce")
    result["housing_stock"] = pd.to_numeric(result["housing_stock"], errors="coerce")
    result = result.dropna(subset=["area_id", "year", "vacant_homes", "housing_stock"])
    result = result[result["housing_stock"] > 0]
    result["year"] = result["year"].astype(int)
    result["vacant_homes"] = result["vacant_homes"].clip(lower=0).round().astype(int)
    result["housing_stock"] = result["housing_stock"].round().astype(int)
    if (result["vacant_homes"] > result["housing_stock"]).any():
        raise ValueError("Vacant-home counts cannot exceed housing-stock denominators")
    result["vacancy_rate"] = (100 * result["vacant_homes"] / result["housing_stock"]).round(3)
    if "borough" not in result:
        result["borough"] = "Unknown"
    else:
        result["borough"] = result["borough"].fillna("Unknown").astype(str).str.strip()
    result["geography"] = infer_geography(result["area_id"])
    if result["geography"].eq("Property").all():
        raise ValueError(
            "Property-level records are not accepted by the public API; aggregate them to LSOA, "
            "MSOA or borough first"
        )
    result["source"] = source
    result["is_synthetic"] = is_synthetic
    result = result[[
        "area_id", "area_name", "geography", "borough", "year", "vacant_homes",
        "housing_stock", "vacancy_rate", "source", "is_synthetic",
    ]].sort_values(["year", "area_id"])
    duplicates = result.duplicated(["area_id", "year"], keep=False)
    if duplicates.any():
        examples = result.loc[duplicates, ["area_id", "year"]].drop_duplicates().head(5)
        raise ValueError(f"Duplicate area/year observations found: {examples.to_dict(orient='records')}")
    return result.reset_index(drop=True)


def load_snapshot(path: Path, *, source: str = "Imported snapshot") -> pd.DataFrame:
    if path.suffix.lower() == ".parquet":
        frame = pd.read_parquet(path)
    elif path.suffix.lower() in {".csv", ".txt"}:
        frame = pd.read_csv(path)
    else:
        raise ValueError("Snapshot must be CSV or Parquet")
    return normalise_dataset(frame, source=source)


def export_snapshot(frame: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix.lower() == ".parquet":
        frame.to_parquet(path, index=False)
    elif path.suffix.lower() == ".csv":
        frame.to_csv(path, index=False)
    else:
        raise ValueError("Export path must end in .csv or .parquet")

