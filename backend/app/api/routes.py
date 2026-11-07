from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.schemas import (
    AreaDetail,
    AreasResponse,
    ConstituenciesResponse,
    ConstituencyMarketRecord,
    DatasetMetadata,
    DataStatus,
    ModelStatus,
)
from app.services.repository import repository

router = APIRouter(prefix="/api")


@router.get("/data/status", response_model=DataStatus)
def data_status() -> DataStatus:
    return repository.status()


@router.get("/datasets", response_model=list[DatasetMetadata])
def datasets() -> list[DatasetMetadata]:
    return repository.metadata()


@router.get("/constituencies", response_model=ConstituenciesResponse)
def constituencies() -> ConstituenciesResponse:
    try:
        return {
            "items": repository.constituencies(),
            "summary": repository.constituency_summary(),
        }
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/constituencies/{ons_code}", response_model=ConstituencyMarketRecord)
def constituency_detail(ons_code: str) -> ConstituencyMarketRecord:
    try:
        constituency = repository.constituency(ons_code)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if constituency is None:
        raise HTTPException(status_code=404, detail=f"Constituency {ons_code!r} was not found")
    return constituency


@router.get("/areas", response_model=AreasResponse)
def areas(
    year: int | None = None,
    geography: str | None = None,
    borough: str | None = None,
) -> AreasResponse:
    try:
        items = repository.areas(year=year, geography=geography, borough=borough)
        return {
            "items": items,
            "summary": repository.summary(year=year, geography=geography, borough=borough),
        }
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/areas/{area_id}", response_model=AreaDetail)
def area_detail(area_id: str, year: int | None = None) -> AreaDetail:
    try:
        area = repository.area(area_id, year=year)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if area is None:
        raise HTTPException(status_code=404, detail=f"Area {area_id!r} was not found")
    return area


@router.get("/geojson")
def geojson(year: int | None = None) -> dict:
    try:
        return repository.geojson(year=year)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/model/status", response_model=ModelStatus)
def model_status() -> ModelStatus:
    path = settings.data_dir / "model_metrics.json"
    if not path.exists():
        return {
            "available": False,
            "trained": False,
            "metrics": None,
            "message": "No genuinely trained forecasting model is available. Prediction layers are disabled.",
        }
    try:
        result = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        raise HTTPException(status_code=500, detail="Model metrics file is invalid")
    if not result.get("trained"):
        return {"available": False, **result}
    return {"available": True, **result}

