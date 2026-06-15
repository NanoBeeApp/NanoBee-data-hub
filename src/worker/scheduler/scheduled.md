# src/worker/scheduler/scheduled.ts

## Responsibility
The Cloudflare Cron Trigger handler body. Each tick it walks every source that
opted into a `schedule`, refreshes the due ones, persists history + the cached
snapshot, and applies retention.

## Core exports / API
- `runScheduled(env)` — wired from `src/server.ts` `scheduled()`.

## Dependencies
- Downstream: `storage` (`getStore`), `sources/persist` (`persistResult`),
  `sources/registry` (`listScheduledSources`, `coerceParams`),
  `scheduler/market-calendar` (`shouldRefresh`).

## Notes
- Write rules honoured: on fetch failure it bumps `consecutive_failures` and
  keeps the last good snapshot rather than overwriting it with an error.
- The FIRST `refreshParams()` set is treated as the canonical snapshot.
- No-op (logs and returns) when no DB is bound.
- Self-host: the same `runScheduled(env)` can be driven by node-cron — it has no
  Cloudflare-specific scheduling dependency.

## Change history

### 2026-06-15 — created
- **Motivation**: the hub needed to auto-update data on a schedule, not only on
  request.
- **Goal**: one trading-hours-aware refresh loop over all scheduled sources.
- **Key decision**: reuse the exact persist/cache code the read path uses
  (`persistResult` + `source_state`), so scheduled and on-demand writes are
  identical.
