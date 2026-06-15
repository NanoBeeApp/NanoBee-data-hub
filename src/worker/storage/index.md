# src/worker/storage/index.ts

## Responsibility
Storage factory + barrel. Resolves the concrete `DataStore` for the current
runtime from the Worker env, and re-exports the storage types.

## Core exports / API
- `getStore(env): DataStore | null` — returns a `D1Store` when `env.DB` is
  bound, else `null` (graceful degradation to live-only).
- `StoreEnv` — the env subset the storage layer reads (`DB`, `BLOBS`).
- Re-exports everything from `./types`.

## Dependencies
- Downstream: `d1-store.ts`.
- Upstream: `routes/sources.ts`, `scheduler/scheduled.ts`.

## Notes
- Returning `null` when no DB is bound keeps the gateway working exactly as
  before storage existed — the read path serves live data and skips
  persistence. This is what lets us ship the binding incrementally (e.g. before
  a prod D1 exists, or in a self-host build without it configured).
- The self-host branch (SqliteStore/PgStore) would be added here.

## Change history

### 2026-06-15 — created
- **Motivation**: callers need one place to obtain a store without knowing the
  backend, and the hub must still run when no storage is provisioned.
- **Goal**: a tiny factory with graceful `null` fallback.
- **Key decision**: env-driven resolution; `null` (not a throwing/no-op stub)
  so callers branch explicitly on "do we have storage".
