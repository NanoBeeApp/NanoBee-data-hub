# src/worker/sources/econ-calendar.ts

## Responsibility
This week's economic calendar / macro data events (NFP, CPI, rate decisions,
GDP, PMI ...). Answers 经济数据 / 财经日历 / 本周重要数据 / 非农 / 美联储 type
questions.

## Core exports / API
- `econCalendar: DataSource` — id `econ_calendar`; optional `currency` and
  `impact` filters. `fetch()` pulls Forex Factory's free weekly JSON and returns
  a High-impact-first digest (time in UTC, currency, impact, forecast, previous).

## Dependencies
- Upstream: `registry.ts` (SOURCES), `routes/sources.ts` (generic invoke).
- Downstream: Forex Factory free weekly JSON (`nfs.faireconomy.media`), no key.

## Notes
- No API key needed. The upstream rate-limits to ~2 req / 5 min — do not poll
  it tightly.
- Forex Factory's `country` field is actually the **currency** code
  (USD/EUR/CNY/...); the `currency` filter matches against it.
- Capped to the top 30 events (High impact first) to keep the prompt small.

## Change history

### 2026-06-15 — created
- **Motivation**: extend the data hub with macro data (referencing
  gold-monitor's Forex Factory economic-calendar usage) so the agent can answer
  "what economic data is out this week / 本周重要数据" questions.
- **Key decision**: use the free Forex Factory weekly JSON (no key); return a
  High-impact-first digest with optional currency/impact filters.
