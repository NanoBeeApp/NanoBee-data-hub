# src/worker/sources/persist.ts

## Responsibility
Shared helpers that map a fetched `SourceResult` into the store, used by both
the scheduler (background refresh) and the HTTP read path (write-through).

## Core exports / API
- `persistResult(store, source, result)` — writes history per the source's
  `persist.shape` (`observations` via `toObservations`, `records` via
  `toRecords`).
- `snapshotEligible(source, raw)` — whether the cached snapshot may serve a
  request; defaults to "only when the caller passed no narrowing params".

## Dependencies
- Upstream: `scheduler/scheduled.ts`, `routes/sources.ts`.
- Downstream: `storage/types.ts` (`DataStore`), `sources/types.ts`.

## Notes
- Lives here (not in routes or scheduler) to avoid a circular import and to keep
  one authority on how a result becomes stored data.

## Change history

### 2026-06-15 — created
- **Motivation**: scheduler and read path both need identical persist + cache
  logic.
- **Goal**: one shared, side-effect-free mapping layer.
- **Key decision**: default snapshot eligibility = "no params", so specific
  queries always hit live data while the common "latest" case is cached.
