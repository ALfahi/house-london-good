from __future__ import annotations

import numpy as np


def regression_metrics(actual: np.ndarray, predicted: np.ndarray) -> dict[str, float]:
    errors = np.asarray(predicted) - np.asarray(actual)
    return {
        "mae": float(np.mean(np.abs(errors))),
        "rmse": float(np.sqrt(np.mean(errors**2))),
    }

