from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]

try:
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR.parent / ".env")
    load_dotenv(BACKEND_DIR / ".env", override=True)
except ImportError:
    # Environment variables still work without the optional convenience loader.
    pass


@dataclass(frozen=True)
class Settings:
    app_env: str = os.getenv("APP_ENV", "development")
    frontend_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    )
    data_snapshot_path: str | None = os.getenv("DATA_SNAPSHOT_PATH") or None
    data_dir: Path = BACKEND_DIR / "data"


settings = Settings()

