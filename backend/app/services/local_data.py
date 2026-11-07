from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from app.services.data_processing import normalise_dataset

VACANCY_FILE = "Live_Table_615.ods"
TAXBASE_FILE = "2025_Local_Authority_Drop_Down.xlsx"
DEPRIVATION_FILE = "File_10_-_IoD2025_Local_Authority_District_Summaries__lower-tier__v2.xlsx"
BOUNDARY_FILE = "london_boroughs_2024.geojson"
CONSTITUENCY_MARKET_FILE = "london_empty_homes_vs_house_prices.csv"

SOURCE_NAME = "MHCLG Live Table 615 and Council Taxbase 2025"
CONSTITUENCY_MARKET_SOURCE = "London empty homes vs house prices constituency snapshot"
BOUNDARY_SOURCE = (
    "ONS Local Authority Districts (December 2024) Boundaries UK BGC · OGL v3.0"
)

DEPRIVATION_SCORE_COLUMNS = {
    "IMD": ("IMD - Average score ", "imd_average_score"),
    "Income": ("Income - Average score ", "income_deprivation_score"),
    "Employment": ("Employment - Average score ", "employment_deprivation_score"),
    "Education": (
        "Education, Skills and Training - Average score ",
        "education_deprivation_score",
    ),
    "Health": (
        "Health Deprivation and Disability - Average score ",
        "health_deprivation_score",
    ),
    "Crime": ("Crime - Average score ", "crime_deprivation_score"),
    "Barriers": (
        "Barriers to Housing and Services - Average score ",
        "housing_services_barriers_score",
    ),
    "Living": ("Living Environment - Average score ", "living_environment_score"),
}

CONSTITUENCY_MARKET_COLUMNS = (
    "constituency",
    "ons_code",
    "empty_homes_pct",
    "vacant_homes_count",
    "long_term_empty_homes_count",
    "long_term_empty_pct",
    "empty_homes_premium_count",
    "homes_on_council_tax_list",
    "house_price_gbp",
    "house_price_1y_change_pct",
    "house_price_5y_change_pct",
    "price_to_earnings_ratio",
    "vacant_per_1000_homes",
)


def bundled_files_available(data_dir: Path) -> bool:
    required = (VACANCY_FILE, TAXBASE_FILE, DEPRIVATION_FILE, BOUNDARY_FILE)
    return all((data_dir / name).exists() for name in required)


def load_constituency_market_data(data_dir: Path) -> pd.DataFrame:
    """Load and validate the bundled constituency-level market snapshot.

    These rows are kept separate from the borough frame because parliamentary
    constituencies and local-authority districts are different geographies.
    """
    path = data_dir / CONSTITUENCY_MARKET_FILE
    frame = pd.read_csv(path)
    missing = set(CONSTITUENCY_MARKET_COLUMNS) - set(frame.columns)
    if missing:
        raise ValueError(
            f"{CONSTITUENCY_MARKET_FILE} is missing columns: {sorted(missing)}"
        )
    frame = frame.loc[:, CONSTITUENCY_MARKET_COLUMNS].copy()
    frame["constituency"] = frame["constituency"].astype("string").str.strip()
    frame["ons_code"] = frame["ons_code"].astype("string").str.strip().str.upper()
    if frame["constituency"].isna().any() or frame["constituency"].eq("").any():
        raise ValueError("Constituency names must be present")
    if not frame["ons_code"].str.fullmatch(r"E14\d{6}", na=False).all():
        raise ValueError("Constituency ONS codes must use the E14 parliamentary format")
    if frame["ons_code"].duplicated().any():
        raise ValueError("Constituency ONS codes must be unique")

    numeric_columns = set(CONSTITUENCY_MARKET_COLUMNS) - {"constituency", "ons_code"}
    for column in numeric_columns:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    required_numeric = numeric_columns - {"price_to_earnings_ratio"}
    if frame[list(required_numeric)].isna().any().any():
        raise ValueError("Constituency market data contains missing or invalid numeric values")

    non_negative = required_numeric - {
        "house_price_1y_change_pct",
        "house_price_5y_change_pct",
    }
    if (frame[list(non_negative)] < 0).any().any():
        raise ValueError("Constituency counts, rates, and prices cannot be negative")
    if (frame["homes_on_council_tax_list"] <= 0).any():
        raise ValueError("Constituency housing stock must be greater than zero")
    if (frame["house_price_gbp"] <= 0).any():
        raise ValueError("Constituency house prices must be greater than zero")
    if (frame["price_to_earnings_ratio"].dropna() < 0).any():
        raise ValueError("Price-to-earnings ratios cannot be negative")

    calculated_pct = 100 * frame["vacant_homes_count"] / frame["homes_on_council_tax_list"]
    if ((calculated_pct - frame["empty_homes_pct"]).abs() > 0.001).any():
        raise ValueError("Empty-home percentages do not match the supplied counts")

    frame["house_price_gbp"] = frame["house_price_gbp"].round().astype(int)
    frame["price_to_earnings_ratio"] = frame["price_to_earnings_ratio"].astype(object).where(
        frame["price_to_earnings_ratio"].notna(), None
    )
    return frame.sort_values("constituency").reset_index(drop=True)


def load_london_borough_data(
    data_dir: Path,
) -> tuple[pd.DataFrame, dict[str, Any], dict[str, list[dict[str, int]]]]:
    """Build 2025 London borough vacancy rates from the supplied official workbooks.

    Live Table 615 provides the all-vacant numerator. The Council Taxbase workbook's
    valuation-list total provides the matching all-dwelling denominator. Live Table 116
    is deliberately not used because it covers only local-authority-owned stock.
    """
    vacancy = pd.read_excel(
        data_dir / VACANCY_FILE,
        sheet_name="All_vacants",
        header=2,
        engine="odf",
    )
    vacancy = vacancy[
        vacancy["ONS code"].astype(str).str.fullmatch(r"E09\d{6}", na=False)
    ].copy()
    count_history: dict[str, list[dict[str, int]]] = {}
    date_columns = [column for column in vacancy.columns if "/" in str(column)]
    for _, row in vacancy.iterrows():
        points = []
        for column in date_columns:
            value = pd.to_numeric(row[column], errors="coerce")
            if pd.notna(value):
                points.append({"year": int(str(column)[-4:]), "vacant_homes": int(value)})
        count_history[str(row["ONS code"])] = points
    vacancy = vacancy[["ONS code", "Area", "06/10/2025"]].rename(
        columns={"ONS code": "area_id", "Area": "area_name", "06/10/2025": "vacant_homes"}
    )

    taxbase = pd.read_excel(
        data_dir / TAXBASE_FILE,
        sheet_name="Council Taxbase Data",
        header=5,
        usecols="A:N",
        engine="openpyxl",
    )
    taxbase = taxbase[
        taxbase["ONS Code"].astype(str).str.fullmatch(r"E09\d{6}", na=False)
    ][["ONS Code", "Total"]].rename(
        columns={"ONS Code": "area_id", "Total": "housing_stock"}
    )

    merged = vacancy.merge(taxbase, on="area_id", how="inner", validate="one_to_one")
    if len(merged) != 33:
        raise ValueError(f"Expected all 33 London local authorities; matched {len(merged)}")
    merged["year"] = 2025
    merged["borough"] = "Greater London"
    frame = normalise_dataset(merged, source=SOURCE_NAME).assign(geography="London borough")

    deprivation_path = data_dir / DEPRIVATION_FILE
    deprivation = pd.read_excel(
        deprivation_path,
        sheet_name="IMD",
        engine="openpyxl",
    ).rename(
        columns={
            "Local Authority District code (2024)": "area_id",
            "IMD - Average score ": "imd_average_score",
            "IMD - Rank of average score ": "imd_rank_average_score",
            "IMD - Proportion of LSOAs in most deprived 10% nationally ":
                "imd_most_deprived_10pct",
        }
    )[["area_id", "imd_average_score", "imd_rank_average_score", "imd_most_deprived_10pct"]]

    for sheet_name, (source_column, target_column) in DEPRIVATION_SCORE_COLUMNS.items():
        if sheet_name == "IMD":
            continue
        domain = pd.read_excel(
            deprivation_path,
            sheet_name=sheet_name,
            engine="openpyxl",
            usecols=["Local Authority District code (2024)", source_column],
        ).rename(
            columns={
                "Local Authority District code (2024)": "area_id",
                source_column: target_column,
            }
        )
        deprivation = deprivation.merge(domain, on="area_id", validate="one_to_one")

    frame = frame.merge(deprivation, on="area_id", how="left", validate="one_to_one")

    boundaries = json.loads((data_dir / BOUNDARY_FILE).read_text(encoding="utf-8"))
    for feature in boundaries.get("features", []):
        properties = feature.setdefault("properties", {})
        properties["area_id"] = properties.pop("LAD24CD", "")
        properties["area_name"] = properties.pop("LAD24NM", "")
    boundary_codes = {
        feature.get("properties", {}).get("area_id") for feature in boundaries.get("features", [])
    }
    missing = set(frame["area_id"]) - boundary_codes
    if missing:
        raise ValueError(f"ONS boundary file is missing area codes: {sorted(missing)}")
    return frame, boundaries, count_history
