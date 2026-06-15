# src/worker/sources/forex.ts

## Responsibility
Foreign exchange rate data source. Returns real-time FX pair quotes (rate,
daily change, percent change) so chat questions like "美元汇率" / "欧元兑美元" /
"人民币汇率" / "外汇行情" / "GBP/USD" can be answered with live data instead of
the model estimating from training weights.

Default pairs: EUR/USD, USD/JPY, USD/CNH (offshore Chinese yuan), GBP/USD.
An optional `pairs` param lets the caller request any other Twelve Data
supported FX symbols.

## Core exports / API
- `forex: DataSource` — id `forex`; optional `pairs` param (comma-separated
  symbol strings, defaults to `EUR/USD,USD/JPY,USD/CNH,GBP/USD`). `fetch()`
  calls Twelve Data `/quote` and returns the current rate, daily change, and
  percent change per pair. Pairs with errors are surfaced individually; the
  overall fetch only throws when **no** pair returns a usable rate.

## Dependencies
- Upstream: `registry.ts` (to be registered in `SOURCES`), `routes/sources.ts`
  (generic catalog + invoke surface).
- Downstream: Twelve Data `/quote` API; `env.TWELVE_DATA_KEY` (project-level
  credential, never imported from or dependent on `gold.ts` or `stocks.ts`).

## Notes
- The Twelve Data key is read from `env.TWELVE_DATA_KEY`, never exposed as a
  model-visible param (shared public-data credential, not per-user).
- The free-tier quota is 8 requests/min and each symbol in a multi-symbol
  `/quote` call counts as 1 credit. This quota is shared across `forex`,
  `gold`, and `stocks` sources — so the pair list is capped at 8 entries.
- A single-symbol Twelve Data `/quote` response is a flat JSON object; a
  multi-symbol request returns a map keyed by the symbol string (e.g.
  `"EUR/USD"`). `fetch()` normalises both to a map for uniform iteration.
- FX has no exchange volume — `volume` does not appear in the response for
  currency pairs. The `fifty_two_week` nested object is available from Twelve
  Data but is not mapped to observations (too static for hourly ingestion).
- `USD/CNH` is the offshore (Hong Kong) Chinese yuan, which trades freely.
  `USD/CNY` is the onshore rate, subject to PBOC daily fixing, and is NOT the
  same instrument.
- The schedule cadence is `hourly` (not `market`) because FX trades nearly
  around the clock on weekdays, covering Asian, London, and New York sessions.
- `persist.shape: "observations"` stores `<PAIR>.rate` as a time-series;
  `rawTtlDays: 90` keeps ~3 months of hourly snapshots.
- The canonical cached snapshot used by the read path is the default four-pair
  set (`DEFAULT_PAIRS`), matching `refreshParams()[0]`.

## Change history

### 2026-06-15 — created
- **Motivation**: the NanoBee agent could not answer currency / exchange-rate
  questions ("美元汇率" / "欧元兑美元") — the data hub had no FX source, so the
  model fell back to training-weight estimates which are stale and unverifiable.
- **Goal**: a structured FX source that gives the agent a `datahub_forex` tool
  and allows it to report live EUR/USD, USD/JPY, USD/CNH, and GBP/USD rates,
  along with daily change figures.
- **Key decision**: reuse the existing `env.TWELVE_DATA_KEY` credential (shared
  with `gold.ts` and `stocks.ts`) — no new secrets needed. Persist as
  `observations` (numeric time-series) with `hourly` cadence so the hub builds
  an FX rate history for trend queries. Use `USD/CNH` (offshore yuan) rather
  than `USD/CNY` (onshore) to get a freely tradeable rate.
