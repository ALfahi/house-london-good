from __future__ import annotations

from pydantic import BaseModel, Field


class HistoryPoint(BaseModel):
    year: int
    vacant_homes: int
    housing_stock: int
    vacancy_rate: float


class VacancyCountPoint(BaseModel):
    year: int
    vacant_homes: int


class AreaSummary(BaseModel):
    area_id: str
    area_name: str
    geography: str
    borough: str
    year: int
    vacant_homes: int = Field(ge=0)
    housing_stock: int = Field(gt=0)
    vacancy_rate: float = Field(ge=0)
    source: str
    is_synthetic: bool
    imd_average_score: float | None = None
    imd_rank_average_score: int | None = None
    imd_most_deprived_10pct: float | None = None
    income_deprivation_score: float | None = None
    employment_deprivation_score: float | None = None
    education_deprivation_score: float | None = None
    health_deprivation_score: float | None = None
    crime_deprivation_score: float | None = None
    housing_services_barriers_score: float | None = None
    living_environment_score: float | None = None


class AreaDetail(AreaSummary):
    history: list[HistoryPoint]
    vacancy_count_history: list[VacancyCountPoint] = Field(default_factory=list)
    london_average_rate: float
    difference_from_london: float


class AreaAggregate(BaseModel):
    year: int
    total_vacant_homes: int
    total_housing_stock: int
    average_vacancy_rate: float
    area_count: int


class AreasResponse(BaseModel):
    items: list[AreaSummary]
    summary: AreaAggregate


class ConstituencyMarketRecord(BaseModel):
    constituency: str
    ons_code: str = Field(pattern=r"^E14\d{6}$")
    empty_homes_pct: float = Field(ge=0)
    vacant_homes_count: float = Field(ge=0)
    long_term_empty_homes_count: float = Field(ge=0)
    long_term_empty_pct: float = Field(ge=0)
    empty_homes_premium_count: float = Field(ge=0)
    homes_on_council_tax_list: float = Field(gt=0)
    house_price_gbp: int = Field(gt=0)
    house_price_1y_change_pct: float
    house_price_5y_change_pct: float
    price_to_earnings_ratio: float | None = Field(default=None, ge=0)
    vacant_per_1000_homes: float = Field(ge=0)


class ConstituencyMarketAggregate(BaseModel):
    constituency_count: int = Field(ge=0)
    estimated_vacant_homes: float = Field(ge=0)
    estimated_long_term_empty_homes: float = Field(ge=0)
    estimated_homes_on_council_tax_list: float = Field(gt=0)
    average_empty_homes_pct: float = Field(ge=0)
    median_house_price_gbp: int = Field(gt=0)


class ConstituenciesResponse(BaseModel):
    items: list[ConstituencyMarketRecord]
    summary: ConstituencyMarketAggregate


class DatasetMetadata(BaseModel):
    id: str
    name: str
    description: str
    source: str
    geography: str
    years: list[int]
    units: dict[str, str]
    definitions: dict[str, str]
    is_synthetic: bool
    licence: str


class DataStatus(BaseModel):
    source: str
    connection_state: str
    available_years: list[int]
    is_synthetic: bool
    record_count: int
    constituency_record_count: int
    geography_source: str
    load_error: str | None
    constituency_load_error: str | None
    message: str


class ModelStatus(BaseModel):
    available: bool
    trained: bool
    metrics: dict[str, object] | None = None
    message: str

