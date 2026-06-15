# src/worker/scheduler/market-calendar.ts

## Responsibility
US equity market calendar used to make scheduled refreshes trading-hours aware,
and the per-cadence throttle the scheduler consults each tick.

## Core exports / API
- `marketSession(d?)` → `"pre" | "regular" | "after" | "closed"` (ET).
- `isTradingDay(d?)` → boolean (weekday & not an NYSE holiday).
- `shouldRefresh(cadence, lastFetchAtIso, now?)` → boolean. `market` gates on the
  session (skip closed; ~5min regular, ~15min pre/after); `hourly` ~55min;
  `daily` ~20h.

## Dependencies
- Upstream: `scheduler/scheduled.ts`.
- Uses Web-standard `Intl` for ET time (no deps, DST-correct).

## Notes
- `MARKET_HOLIDAYS` lists NYSE full closures per year — **update each year**.
- Half-days are treated as normal sessions, which is fine for a polling cadence.
- `gold` uses `hourly` (not `market`) on purpose: spot gold trades ~24h on
  weekdays, so the equity-hours gate would wrongly skip its overnight session.

## Change history

### 2026-06-15 — created
- **Motivation**: the cron fires every 5min, but refreshing US equities at 3am
  or on weekends just burns upstream quota.
- **Goal**: a dependency-free ET calendar + cadence throttle.
- **Key decision**: cron stays dumb (every 5min); all "is it due?" logic lives
  here so cadence/holiday rules are testable in isolation.
