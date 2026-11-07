from __future__ import annotations

try:
    import torch
    from torch import Tensor, nn
    from torch_geometric.nn import SAGEConv
except ImportError:  # Web/API installs intentionally do not require the ML stack.
    torch = None
    Tensor = object  # type: ignore[assignment,misc]
    nn = None  # type: ignore[assignment]
    SAGEConv = None  # type: ignore[assignment]


if nn is not None:
    class VacancyGraphSAGE(nn.Module):
        """Two-layer node regressor for a future neighbourhood vacancy rate."""

        def __init__(self, feature_count: int, hidden_channels: int = 32) -> None:
            super().__init__()
            self.conv1 = SAGEConv(feature_count, hidden_channels)
            self.conv2 = SAGEConv(hidden_channels, hidden_channels)
            self.output = nn.Linear(hidden_channels, 1)

        def forward(self, x: Tensor, edge_index: Tensor) -> Tensor:
            x = self.conv1(x, edge_index).relu()
            x = self.conv2(x, edge_index).relu()
            return self.output(x).squeeze(-1)
else:
    class VacancyGraphSAGE:  # pragma: no cover - clear error on optional dependency path
        def __init__(self, *_: object, **__: object) -> None:
            raise RuntimeError("Install the 'ml' dependency group to use VacancyGraphSAGE")

