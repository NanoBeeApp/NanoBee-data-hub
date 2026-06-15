# src/worker/sources/treasury.ts

## Responsibility
US Treasury average interest rates data source. Fetches the most recent
month's **weighted-average coupon rate on outstanding US Treasury securities**
for all ~16 security types (Treasury Bills, Notes, Bonds, TIPS, FRN,
Government Account Series, Total Interest-bearing Debt, etc.) from the public
FiscalData API and returns them as structured observations.

**Important scope note**: this is the weighted-average coupon rate on existing
outstanding debt — it is **NOT** the Federal Reserve policy rate (Fed funds
rate) and **NOT** current market yields. Accurate Chinese keywords:
美国国债平均利率 / 国债平均票息利率 / 美债平均利率 / 美国财政部平均利率.
Do **NOT** surface this source as "美联储利率" or "国债收益率/美债收益率".

Enables chat answers to questions like "美国国债平均利率" / "美债平均利率" /
"Treasury Bill average rate" without any API key.

## Core exports / API
- `treasury: DataSource` — id `treasury`; no required params. `fetch()` calls
  the FiscalData `avg_interest_rates` endpoint, filters to the maximum
  `record_date` in the 50-row page, and maps each security row to a
  `TreasuryItem` (recordDate, securityType, securityDesc, avgRatePct,
  seriesKey). Returns a human-readable `summary` (grouped by security_type)
  plus structured `items`.
- `persist.toObservations()` — maps each `TreasuryItem` to an
  `ObservationInput` with `seriesKey = "avg_rate." + slug(securityDesc)`,
  `ts` = ISO timestamp of the record_date, and `dims` carrying the
  security_type and security_desc labels.
- `schedule.cadence = "daily"` — polls daily so a new month is detected
  within 24 hours; the single `refreshParams` entry (`{}`) serves as the
  canonical snapshot for the cached read path.

## API
- **Endpoint**: `GET https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=50`
- **Auth**: none — fully public US Treasury FiscalData API.
- **Response shape**: `{ data: FdRow[], meta: { count, pagination } }` where
  each `FdRow` carries `record_date` (YYYY-MM-DD), `security_type_desc`,
  `security_desc`, `avg_interest_rate_amt` (numeric string, percentage).
- **Cadence**: data is published once per month (end-of-month `record_date`);
  the 50-row page captures all 16 securities for the latest month in one shot.

## Dependencies
- Upstream: `registry.ts` (registered in `SOURCES`), `routes/sources.ts`
  (generic catalog + invoke surface).
- Downstream: US Treasury FiscalData public REST API; no env credentials.
- Storage: `ObservationInput` from `../storage/types`; `DataSource`,
  `SourceResult` from `./types`.

## Notes
- Only rows matching the **maximum `record_date`** in the fetched batch are
  persisted, preventing duplicate observations on re-runs mid-month.
- `avg_interest_rate_amt` values are percentages (e.g. `3.690` means 3.690 %).
- Security descriptions are slugified to form series keys:
  `"Treasury Bills" → avg_rate.treasury_bills`,
  `"Treasury Inflation-Protected Securities (TIPS)" → avg_rate.treasury_inflation_protected_securities_tips`,
  `"Total Interest-bearing Debt" → avg_rate.total_interest_bearing_debt`, etc.
- `rawTtlDays=400` keeps more than a year of monthly records, enabling
  year-over-year rate comparisons.
- The source throws (never invents a number) when `avg_interest_rate_amt` is
  missing or non-finite for all rows, or when the API returns non-200 / empty.
- When some (but not all) rows are skipped due to missing/invalid
  `avg_interest_rate_amt`, a `console.warn` reports the drop count and date.
- If `security_desc` is absent, the fallback slug is `unknown_line_<src_line_nbr>`
  (when `src_line_nbr` is available) or `unknown`, avoiding upsert collisions
  across multiple missing-desc rows on the same `record_date`.
- Confirmed live against the API on 2026-06-15: latest `record_date` was
  2026-05-31 with 16 security rows.

## Change history

### 2026-06-15 — created
- **Motivation**: NanoBee chat had no tool for US Treasury rates, so questions
  about "美国国债平均利率" / "美债平均利率" / "Treasury Bill average rate" could
  not be answered with live data. The FiscalData API is public and requires no
  key, making it a zero-friction addition.
- **Goal**: a structured treasury source so the agent gains a `datahub_treasury`
  tool and can report the latest monthly weighted-average coupon rate for any US
  Treasury security type, stored as a numeric time-series for trend analysis.
- **Key decision**: `persist.shape: "observations"` (not `"records"`) because
  each security's rate is a pure numeric time-series — exactly what observations
  model. Retention set to `rawTtlDays=400` (>1 year) so year-over-year
  comparisons are possible. `schedule.cadence: "daily"` rather than `"monthly"`
  because there is no reliable publication timestamp; daily polling detects a
  new month within 24 hours at negligible cost (one HTTP request per day).
- **Scope clarification**: corrected keywords and description to accurately
  reflect that this is the weighted-average coupon rate on **outstanding**
  Treasury debt (US Treasury FiscalData `avg_interest_rates`), not the Fed
  funds rate and not current market yields. Removed misleading keywords
  `美联储利率` and `国债收益率`/`美债收益率`; replaced with accurate
  `美国国债平均利率` / `国债平均票息利率` / `美债平均利率` / `美国财政部平均利率`.
- **Drop logging**: added `console.warn` when partial rows are skipped due to
  missing/invalid `avg_interest_rate_amt`, while preserving the all-or-nothing
  throw when zero usable rows remain.
- **Fallback key deduplication**: `security_desc`-missing rows now fall back to
  `unknown_line_<src_line_nbr>` instead of a bare `"Unknown"`, preventing upsert
  collisions when multiple rows on the same date lack a description.
