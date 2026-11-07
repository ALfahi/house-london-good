from __future__ import annotations

from collections.abc import Iterable

import numpy as np


def adjacency_to_edge_index(adjacency: Iterable[tuple[int, int]]) -> np.ndarray:
    """Create a bidirectional PyG-style edge_index from polygon adjacency pairs."""
    directed: set[tuple[int, int]] = set()
    for left, right in adjacency:
        if left == right:
            continue
        directed.add((left, right))
        directed.add((right, left))
    if not directed:
        return np.empty((2, 0), dtype=np.int64)
    return np.asarray(sorted(directed), dtype=np.int64).T


def polygon_adjacency(geometries: list[object]) -> np.ndarray:
    """Connect polygons sharing a boundary; requires Shapely only when called."""
    pairs: list[tuple[int, int]] = []
    for left in range(len(geometries)):
        for right in range(left + 1, len(geometries)):
            first, second = geometries[left], geometries[right]
            if first.touches(second) or first.intersects(second):
                pairs.append((left, right))
    return adjacency_to_edge_index(pairs)

