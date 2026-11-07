from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    assert client.get("/health").json()["status"] == "ok"


def test_official_local_data_vertical_slice() -> None:
    status = client.get("/api/data/status")
    assert status.status_code == 200
    assert status.json()["is_synthetic"] is False
    assert status.json()["connection_state"] == "bundled_official"
    assert status.json()["constituency_record_count"] == 75
    assert status.json()["constituency_load_error"] is None
    areas = client.get("/api/areas?year=2025").json()
    assert areas["summary"]["area_count"] == 33
    assert areas["summary"]["total_vacant_homes"] == 105_138
    area_id = areas["items"][0]["area_id"]
    detail = client.get(f"/api/areas/{area_id}?year=2025").json()
    assert detail["imd_average_score"] is not None
    assert detail["income_deprivation_score"] is not None
    assert detail["employment_deprivation_score"] is not None
    assert detail["education_deprivation_score"] is not None
    assert detail["health_deprivation_score"] is not None
    assert detail["crime_deprivation_score"] is not None
    assert detail["housing_services_barriers_score"] is not None
    assert detail["living_environment_score"] is not None
    assert len(detail["vacancy_count_history"]) >= 20
    geojson = client.get("/api/geojson?year=2025").json()
    assert len(geojson["features"]) == 33


def test_borough_filter_updates_summary() -> None:
    result = client.get("/api/areas?year=2025&borough=Greater%20London").json()
    assert result["summary"]["area_count"] == 33


def test_predictions_are_disabled() -> None:
    result = client.get("/api/model/status").json()
    assert result["available"] is False


def test_dataset_metadata_lists_local_sources() -> None:
    datasets = client.get("/api/datasets").json()
    assert {dataset["id"] for dataset in datasets} == {
        "vacant-homes",
        "index-of-multiple-deprivation-2025",
        "empty-homes-house-prices-by-constituency",
    }


def test_constituency_market_data_is_available() -> None:
    response = client.get("/api/constituencies")
    assert response.status_code == 200
    result = response.json()
    assert result["summary"] == {
        "constituency_count": 75,
        "estimated_vacant_homes": 105_138.0,
        "estimated_long_term_empty_homes": 47_287.0,
        "estimated_homes_on_council_tax_list": 3_846_462.0,
        "average_empty_homes_pct": 2.7334,
        "median_house_price_gbp": 532_000,
    }
    assert result["items"][0]["constituency"] == "Barking"
    assert result["items"][0]["house_price_gbp"] == 360_000


def test_constituency_market_detail_is_case_insensitive() -> None:
    detail = client.get("/api/constituencies/e14001073")
    assert detail.status_code == 200
    assert detail.json()["constituency"] == "Barking"
    assert detail.json()["vacant_per_1000_homes"] == 22.6


def test_unknown_constituency_returns_not_found() -> None:
    response = client.get("/api/constituencies/E14000000")
    assert response.status_code == 404

