# src/worker/sources/stocks.ts

## Responsibility
Real-time US stock / ETF quotes. Answers chat questions about US equity prices
(美股 / 股价 / 纳指 / 标普 / 苹果股价 / QQQ etc.).

## Core exports / API
- `stocks: DataSource` — id `stocks`; required `symbols` param (comma-separated
  tickers). `fetch()` calls Twelve Data `/quote` with `prepost=true` and returns
  price, daily change %, day range, volume and 52-week range for each ticker,
  plus the latest pre-market / after-hours quote when the regular session is
  closed.

## Dependencies
- Upstream: `registry.ts` (SOURCES), `routes/sources.ts` (generic invoke).
- Downstream: Twelve Data API; `env.TWELVE_DATA_KEY` (shared with the gold source).

## Notes
- The key is read from `env.TWELVE_DATA_KEY`, never a model-visible param.
- The free tier has NO stock indices — the description steers the model to the
  tracking ETF instead: Nasdaq→QQQ, S&P 500→SPY, Dow→DIA.
- A single-symbol Twelve Data quote is a flat object; multi-symbol is a map
  keyed by symbol — `fetch()` handles both shapes.
- `symbols` is capped at 8 to protect the 8-req/min free-tier quota.
- Extended hours: `prepost=true` makes the free tier return `extended_price`,
  `extended_change`, `extended_percent_change`, `extended_timestamp`. We only
  surface it while `is_market_open === false`; the session (pre-market /
  after-hours) is derived from the extended timestamp in US-Eastern time via
  `Intl` (no TZ dependency, DST-correct). Spot gold (`gold.ts`) has no extended
  hours — it trades ~23h/5d continuously — so this only applies to equities.

## Change history

### 2026-06-15 — created
- **Motivation**: extend the data hub with US equities (referencing the
  gold-monitor project's QQQ + Twelve Data setup) so the NanoBee agent can
  answer stock-price questions, not just gold.
- **Key decision**: reuse the gold source's Twelve Data key via `env`; accept a
  single comma-separated `symbols` param so the model can batch one request for
  several tickers and stay within free-tier quota.

### 2026-06-15 — add pre-market / after-hours quotes
- **Motivation**: a user asked why stock answers (e.g. QQQ) only show the last
  regular close and lack pre-market / after-hours / overnight prices. Root
  cause: the `/quote` call omitted `prepost=true`, so Twelve Data never returned
  the extended-hours print — we were dropping data the free tier already gives.
- **Goal**: report the live pre-market / after-hours price when the regular US
  session is closed, instead of passing off the stale regular close as current.
- **Key decision**: pass `prepost=true` and read the `extended_*` fields; only
  surface them while `is_market_open === false`; classify the session from the
  extended timestamp in US-Eastern time via `Intl` (DST-correct, zero deps).
  Left `gold.ts` untouched — spot gold is a continuous ~23h market with no
  pre/post session.
