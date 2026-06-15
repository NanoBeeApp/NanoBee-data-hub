# src/worker/sources/stocks.ts

## Responsibility
Real-time US stock / ETF quotes. Answers chat questions about US equity prices
(美股 / 股价 / 纳指 / 标普 / 苹果股价 / QQQ etc.).

## Core exports / API
- `stocks: DataSource` — id `stocks`; required `symbols` param (comma-separated
  tickers). `fetch()` calls Twelve Data `/quote` and returns price, daily
  change %, day range, volume and 52-week range for each ticker.

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

## Change history

### 2026-06-15 — created
- **Motivation**: extend the data hub with US equities (referencing the
  gold-monitor project's QQQ + Twelve Data setup) so the NanoBee agent can
  answer stock-price questions, not just gold.
- **Key decision**: reuse the gold source's Twelve Data key via `env`; accept a
  single comma-separated `symbols` param so the model can batch one request for
  several tickers and stay within free-tier quota.
