#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.services.data_processing import export_snapshot, inspect_dataset, load_snapshot

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate and normalise an authorised CSV/Parquet export")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--source", default="Authorised local data export")
    args = parser.parse_args()
    frame = load_snapshot(args.input, source=args.source)
    export_snapshot(frame, args.output)
    print(json.dumps(inspect_dataset(frame), indent=2, default=str))

