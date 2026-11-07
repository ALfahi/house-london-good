from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class TemporalSplit:
    train_years: list[int]
    test_year: int
    area_ids: list[str]
    features: np.ndarray
    target: np.ndarray


def build_temporal_dataset(frame: pd.DataFrame, *, minimum_history: int = 3) -> TemporalSplit:
    """Build lagged features with the last year held out to prevent temporal leakage."""
    years = sorted(frame["year"].unique().astype(int).tolist())
    if len(years) < minimum_history:
        raise ValueError(
            f"At least {minimum_history} annual observations per area are needed; found {len(years)}"
        )
    pivot = frame.pivot(index="area_id", columns="year", values="vacancy_rate").dropna()
    if pivot.empty:
        raise ValueError("No areas have complete annual vacancy histories")
    test_year = years[-1]
    train_years = years[:-1]
    return TemporalSplit(
        train_years=train_years,
        test_year=test_year,
        area_ids=pivot.index.astype(str).tolist(),
        features=pivot[train_years].to_numpy(dtype=np.float32),
        target=pivot[test_year].to_numpy(dtype=np.float32),
    )


def historical_baseline(split: TemporalSplit) -> np.ndarray:
    """Last-observation-carried-forward baseline."""
    return split.features[:, -1].copy()

