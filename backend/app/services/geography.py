from __future__ import annotations

from collections.abc import Iterable
from typing import Any


def feature_collection(features: Iterable[dict[str, Any]]) -> dict[str, Any]:
    return {"type": "FeatureCollection", "features": list(features)}


def rectangle_feature(
    *, area_id: str, west: float, south: float, east: float, north: float
) -> dict[str, Any]:
    """Create deliberately generalised demo geometry, never presented as official boundaries."""
    return {
        "type": "Feature",
        "properties": {"area_id": area_id},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [west, south], [east, south], [east, north], [west, north], [west, south]
            ]],
        },
    }


def attach_statistics(
    boundaries: dict[str, Any], records: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    features = []
    for feature in boundaries.get("features", []):
        area_id = str(feature.get("properties", {}).get("area_id", ""))
        if area_id not in records:
            continue
        features.append({
            **feature,
            "properties": {**feature.get("properties", {}), **records[area_id]},
        })
    return feature_collection(features)

