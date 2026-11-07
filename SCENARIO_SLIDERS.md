# Borough vacancy scenario sliders

## What changed

Click a borough on the map or comparison plot to select it. Map rendering, selection and year-change behavior are restored byte-for-byte from the uploaded project; the slider update does not modify them. The existing deprivation scores remain read-only. A new Vacancy scenarios section displays eleven separate factor cards, each with the borough's observed value and a slider. One sticky summary shows combined predicted vacancy and the total percentage-point change. Reset a single factor or all factors. Switching boroughs or vacancy years resets scenarios to the selected area's baseline.

The data is bundled in frontend/src/data/borough-scenarios.json, keyed by the same E09 ONS codes as the map. No extra provider requests or backend setup are required. The imported snapshot contains all eleven measures for all 33 London local authorities, except recorded crime for City of London: that card explains why it is unavailable, rather than substituting zero. Synthetic demonstration areas are not joined to real borough data.

## Calculation

The combined scenario applies V_final = V_observed + SUM(slope_i * (X_scenario_i - X_observed_i)). V_observed is the selected year's vacancy rate already supplied by the app. The selected borough vacancy baseline is included once; factor contributions are added. Zero change reproduces the exact observed vacancy. Invalid predictions outside 0–100% are labelled outside valid range, with the raw linear output shown; they are not silently clamped. Sliders warn when a value is outside the observed factor range. Percentage inputs use percentage numbers (25 means 25%), never proportions.

All ten socioeconomic slopes are the agreed 2021 borough fits, even when applied to the app's 2025 starting vacancy. The UI labels these as illustrative scenarios, not validated forecasts or causal estimates. It shows source dates and model diagnostics. This extrapolation does not estimate within-borough effects over time, and no factor survives adjustment for the ten exploratory socioeconomic comparisons.

House price uses the previously agreed inverse slope, 1 / 39778.187315580035 vacancy percentage points per pound. This coefficient originated in the saved, trimmed London constituency analysis; it is not a borough regression. The price starting values are newly sourced borough values and are not constituency estimates allocated to boroughs. The old price coefficient has not been independently revalidated against the earlier trimming procedure; retain its illustrative label pending a reproducible borough-level refit.

## Data sources

The ten socioeconomic columns and exact slope coefficients are copied from the completed borough analysis:

- Census 2021 TS006, TS007, TS044, TS052, TS054, TS066, TS067 via https://www.nomisweb.co.uk/census/2021/bulk : density, approximate mean age (100+ coded 100), flat-household share, bedroom overcrowding, private renting, unemployment among economically active residents aged 16+, and Level 4+ qualifications among residents aged 16+.
- HMRC Table 3.14, 2021–22 median total personal income among taxpayers, not household income: https://www.gov.uk/government/statistics/income-and-tax-by-borough-and-district-or-unitary-authority-2010-to-2011 .
- MPS recorded offences, January–December 2021, per 1,000 Census residents; excludes City of London. Resident-denominated rates may reflect commuter/visitor exposure: https://data.london.gov.uk/download/exy3m/730d2c68-3fa4-4d4b-ae2c-62f6044d8443/MPS%20Borough%20Level%20Crime%20%28Historical%29.csv .
- TfL 2015 borough average numerical PTAI, not the ordered PTAL categories: https://data.london.gov.uk/download/24rz6/8e520b81-dd06-4ce6-aaa0-972dccf84b57/Borough%20AvPTAI2015.csv . This predates recent transport changes.
- NEW house-price baselines: HM Land Registry UK HPI, Average price worksheet, October 2025 row, borough ONS code columns. All 33 borough values loaded and validated. This is the UK HPI modelled average price, not the arithmetic mean transaction price: https://data.london.gov.uk/download/2zwx6/70ac0766-8902-4eb5-aab5-01951aaed773/UK%20House%20price%20index.xlsx . Retrieved 7 November 2026. Raw workbook included in backend/data/scenario_house_prices_hpi.xlsx for traceability.

Analysis tables are included in backend/data/scenario_borough_baselines.csv and scenario_regressions.csv. The frontend uses its bundled JSON snapshot, so editing a CSV alone does not update the UI. To refresh, join by borough_code and update the JSON boroughs/model records after refitting and validating units. Existing backend IMD fields must not be substituted for these measures.

## Validation

From frontend/:

    npm ci
    npm run typecheck
    npm run build
    node --test src/lib/scenarios.test.cjs

Tests cover all 33 data joins and the City exception, unchanged-value identity, pound/percentage units, infeasible outputs and slider bounds. Production compilation and type checking pass. Standard backend startup is unchanged; see README.md.

Browser interaction verification could not run in this environment: Chromium was absent and its download returned an invalid archive. Calculation tests, 33-area server-render tests, TypeScript checks and the production build passed.

## Combined result update

All slider changes now contribute to a single sticky combined result. Reset all restores every input and the exact observed vacancy; per-factor reset remains available. Separate marginal slopes are being added by user request, not re-estimated jointly. Correlated factors can double-count the same association. This is an illustrative additive index, not a validated multivariable forecast. Per-card predictions and repetitive diagnostic paragraphs were removed; method details remain in one expandable note. Seven calculation and render checks passed, including multiple simultaneous changes, baseline identity on reset, and exactly one rendered result per borough.

## Compact slider layout

Factor cards are replaced by compact rows: factor label, current scenario value and range slider. Repeated baseline/source/min/max text and per-factor reset buttons are removed from each row. All observed values and dates remain in the expandable notes; Reset all and the single combined result remain. This update changes only ScenarioPanel.tsx and the slider-specific CSS (plus this documentation). The map, page selection logic and data are unchanged.
