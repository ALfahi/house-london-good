from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import settings

app = FastAPI(
    title="London Vacancy Explorer API",
    version="0.1.0",
    description="Aggregated neighbourhood vacancy statistics; never exposes residential addresses.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.frontend_origins),
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "london-vacancy-explorer-api"}

