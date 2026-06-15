# src/worker/sources/gold.ts

## Responsibility
Spot gold price data source. Returns international spot gold (XAU/USD per troy
ounce) plus a derived per-gram price in USD and CNY, so chat questions like
"黄金现价" / "金价" / "黄金多少钱一克" / "30 克值多少钱" can be answered with
live data instead of the model apologizing.

## Core exports / API
- `gold: DataSource` — id `gold`; optional `grams` param. `fetch()` calls
  Twelve Data `/quote?symbol=XAU/USD,USD/CNY` and derives per-gram USD/CNY
  (and a total when `grams` is given). Returns a human-readable `summary` plus
  structured `items`.

## Dependencies
- Upstream: `registry.ts` (registered in `SOURCES`), `routes/sources.ts`
  (generic catalog + invoke surface).
- Downstream: Twelve Data API; `env.TWELVE_DATA_KEY` (project-level credential).

## Notes
- The Twelve Data key is read from `env.TWELVE_DATA_KEY`, never exposed as a
  model-visible param (it is a shared public-data credential, not per-user).
- One `/quote` call fetches both XAU/USD and USD/CNY to save free-tier quota
  (8 req/min). The USD/CNY leg is best-effort: if missing, only USD figures
  are reported.
- This is the international spot benchmark, NOT a jeweler retail quote; the
  summary states this and "not investment advice".
- 1 troy ounce = 31.1034768 g.

## Change history

### 2026-06-15 — created
- **Motivation**: NanoBee chat could not answer "黄金现价" — the agent had no
  data tool for gold (data-hub only shipped `hackernews` + `websearch`), so it
  apologized that it "cannot fetch real-time financial data".
- **Goal**: a structured gold source so the agent gains a `datahub_gold` tool
  and can report the live price and compute totals (with the `calculate` skill).
- **Key decision**: project-level Twelve Data key via `env` (not a
  caller-injected per-user secret), since gold is shared public data; derive
  per-gram USD/CNY server-side so a China-based user gets a directly usable
  number.

### 2026-06-15 — persistence + scheduled refresh
- **Motivation**: capture gold as a time-series for trend / overnight analysis.
- **Goal**: persist oz / per-gram USD / per-gram CNY as observations; refresh on
  a schedule.
- **Key decision**: `persist.shape: "observations"`; `schedule.cadence:
  "hourly"` (NOT `market`) — spot gold trades ~24h on weekdays, so an hourly
  poll captures the overnight session the equity-hours gate would skip.
