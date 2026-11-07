# London Vacancy Explorer

A working map-first dashboard for the House London housing data hackathon. It serves real, aggregated 2025 vacant-dwelling statistics for all 33 London local authorities, with historical vacancy counts, selected-borough detail and a cross-borough socioeconomic comparison chart. It never exposes residential addresses.

## Vacancy scenarios

Select a borough to reveal eleven sliders for house prices and socioeconomic factors, prefilled with matched borough data. Deprivation scores remain read-only. Change several sliders to update one combined illustrative vacancy result. Reset all restores the selected borough baselines. See [SCENARIO_SLIDERS.md](SCENARIO_SLIDERS.md) for dates, equations, sources and validation.

## Data used

The application reads the source files committed in `backend/data` once at backend startup:

- `Live_Table_615.ods`: MHCLG all vacant dwellings by local authority, 2004–2025. The current numerator is the 6 October 2025 observation.
- `2025_Local_Authority_Drop_Down.xlsx`: MHCLG Council Taxbase 2025. Table 1.01 total dwellings on the valuation list is the current denominator.
- `File_10_-_IoD2025_Local_Authority_District_Summaries__lower-tier__v2.xlsx`: 2025 Index of Multiple Deprivation overall and seven domain scores at local-authority level.
- `london_empty_homes_vs_house_prices.csv`: constituency-level empty-home estimates, house prices, price changes and price-to-earnings context. This remains available through the API but is not joined to the borough dashboard because parliamentary constituencies do not share borough boundaries.
- `london_boroughs_2024.geojson`: ONS Local Authority Districts (December 2024), 20m generalised clipped boundaries, filtered to London. Source: Office for National Statistics, OGL v3.0; contains OS data © Crown copyright and database right.

The displayed vacancy rate is `100 × all vacant dwellings ÷ total valuation-list dwellings`. Live Table 116 is not used as the denominator because it covers only local-authority-owned stock. Historical count observations are charted, but historical rates are not claimed because matching annual total-stock denominators are not included.

Forest MCP is intentionally not part of the application. The backend is fully local and makes no data-provider request while serving API traffic.

## Architecture

```text
frontend/                    Next.js App Router, React, TypeScript
  src/components/map/        Client-only React Leaflet map and legend
  src/components/dashboard/  Metrics, borough detail, history and comparison chart
backend/                     FastAPI service
  app/api/                   REST routes and response models
  app/services/              Workbook loading, validation, geography and cache
  ml/                        Temporal dataset, adjacency and GraphSAGE foundation
  data/                      Source workbooks and ONS GeoJSON
```

The backend processes the workbooks at process startup and keeps the normalised frame and GeoJSON in memory. An optional `DATA_SNAPSHOT_PATH` CSV/Parquet override remains available for reproducible experiments.

## Run locally

Requirements: Node 20+ and Python 3.11+.

```bash
cp .env.example .env

cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8000
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. API documentation is at <http://localhost:8000/docs>.

Convenience commands from the repository root:

```bash
make backend     # API on :8000
make frontend    # dashboard on :3000
make test        # backend tests + frontend typecheck
make build       # production frontend build
```

## API

| Route | Purpose |
| --- | --- |
| `GET /health` | Liveness check |
| `GET /api/data/status` | Active local source and available years |
| `GET /api/datasets` | Dataset metadata, definitions and licence note |
| `GET /api/constituencies` | Constituency empty-home and house-price records plus London summary |
| `GET /api/constituencies/{ons_code}` | One constituency's economic and empty-home context |
| `GET /api/areas?year=2025` | London boroughs and stock-weighted summary |
| `GET /api/areas/{area_id}?year=2025` | Borough detail, IMD domain context and count history |
| `GET /api/geojson?year=2025` | Map-ready authoritative borough features |
| `GET /api/model/status` | Trained-model availability and metrics |

## Optional snapshot adapter

The public API will also accept a pre-aggregated CSV or Parquet snapshot with logical fields for area code, area name, year/date, vacant-home count and total housing stock:

```bash
cd backend
.venv/bin/python scripts/import_snapshot.py raw.csv data/vacancy.parquet \
  --source 'Documented aggregate source'
DATA_SNAPSHOT_PATH="$PWD/data/vacancy.parquet" .venv/bin/uvicorn app.main:app --reload
```

A matching `.geojson` or `_boundaries.geojson` file can sit beside the snapshot. Property-level identifiers are rejected by the normaliser.

## Machine-learning status

Prediction layers are disabled: no genuinely trained forecasting model exists. The source files provide 22 years of borough vacancy counts, but only a 2025 total-dwelling denominator. Valid vacancy-rate forecasting needs matching annual denominators and preferably additional time-varying housing features.

The ML package includes leakage-aware temporal splitting, a last-observation baseline, ridge-regression comparison, polygon adjacency construction, a two-layer GraphSAGE node regressor, and MAE/RMSE evaluation utilities. Install the optional stack with:

```bash
cd backend
python -m pip install -e '.[geo,ml]'
```

Do not enable prediction layers until a model is trained on appropriate historical features and beats the reported baselines on held-out later observations.

## Verification

```bash
cd backend && .venv/bin/ruff check app ml scripts tests && .venv/bin/pytest
cd frontend && npm run typecheck && npm run build
```
