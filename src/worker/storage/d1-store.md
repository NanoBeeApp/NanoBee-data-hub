# src/worker/storage/d1-store.ts

## Responsibility
Cloudflare D1 (+ R2) implementation of `DataStore`. Persists records,
observations, source state and large blobs, applying the project write rules.

## Core exports / API
- `D1Store implements DataStore` — constructed with `{ DB, BLOBS? }`.
- `D1StoreBindings` — the bindings the store consumes.

## Dependencies
- Upstream: `storage/index.ts` (`getStore`) constructs it from the Worker env.
- Downstream: D1 (`env.DB`) for SQL; R2 (`env.BLOBS`) for blobs (optional).
- Uses WebCrypto `crypto.subtle` for SHA-256 (no deps; Workers/Node/browser).

## Notes
- **Write rules**: upsert by `(source,item_key)` / `(source,series_key,ts)`;
  unchanged content (same `content_hash`) only bumps `last_seen`; each
  `putRecords` / `putObservations` is one atomic D1 `batch`.
- **FTS sync**: `records_fts` is a standalone FTS5 table kept at
  `rowid == records.id`; changed rows do delete-then-insert in the same batch.
- **Blob dedup**: blobs go to R2 at key `source/<contentHash>`, uploaded only
  when absent. The cheap `bytesPreview` fingerprint avoids hashing megabytes
  twice; collisions are astronomically unlikely for dedup purposes.
- **Graceful**: when `BLOBS` is unbound, blob writes are skipped (records still
  persist their structured fields).

## Change history

### 2026-06-15 — created
- **Motivation**: needed a concrete Cloudflare backend for the new storage
  layer so scheduled refresh + read-through could persist data.
- **Goal**: implement `DataStore` on D1/R2 with the write rules baked in.
- **Key decision**: structural (not `@cloudflare/workers-types`) typings for the
  D1/R2 surfaces this file uses, to keep it dependency-light and portable.
