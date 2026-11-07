from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from app.services.data_processing import load_snapshot
from ml.dataset import build_temporal_dataset, historical_baseline
from ml.evaluate import regression_metrics


def main(snapshot: Path, output: Path) -> None:
    frame = load_snapshot(snapshot)
    if bool(frame["is_synthetic"].any()):
        raise SystemExit("Refusing to train/report a forecast from synthetic demonstration data")
    split = build_temporal_dataset(frame, minimum_history=4)
    baseline = historical_baseline(split)

    try:
        from sklearn.linear_model import Ridge
    except ImportError as exc:
        raise SystemExit("Install the 'ml' dependency group before training") from exc

    # Area-level holdout evaluates generalisation while the final calendar year remains unseen.
    indices = np.arange(len(split.area_ids))
    train_idx = indices[indices % 5 != 0]
    test_idx = indices[indices % 5 == 0]
    if len(test_idx) < 2:
        raise SystemExit("Too few complete areas for a defensible held-out evaluation")
    model = Ridge(alpha=1.0).fit(split.features[train_idx], split.target[train_idx])
    regression = model.predict(split.features[test_idx])
    result = {
        "trained": False,
        "prediction_layer_available": False,
        "evaluation_only": True,
        "test_year": split.test_year,
        "held_out_areas": len(test_idx),
        "metrics": {
            "historical_baseline": regression_metrics(split.target[test_idx], baseline[test_idx]),
            "ridge_regression": regression_metrics(split.target[test_idx], regression),
        },
        "message": "Baseline evaluation complete. GraphSAGE training requires matching authoritative boundaries and an explicit spatial/temporal evaluation design.",
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--output", type=Path, default=Path("data/model_metrics.json"))
    args = parser.parse_args()
    main(args.snapshot, args.output)

