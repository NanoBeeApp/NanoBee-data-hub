# src/worker/storage/types.ts

## Responsibility
Storage-layer contracts. Defines the `DataStore` interface plus the three
storage shapes the hub classifies all data into — `ObservationInput` (numeric
time-series), `RecordInput` (documents/feed, FTS-able), and large blobs (web
pages) carried on `RecordInput.blob`. Business code depends only on this
interface, never on a concrete backend.

## Core exports / API
- `DataStore` — `putRecords` / `putObservations` / `getRecords` /
  `getObservations` / `searchRecords` / `getBlob` / `getSourceState` /
  `setSourceState` / `applyRetention`.
- `ObservationInput`, `RecordInput`, `StoredRecord`, `StoredObservation`,
  `SourceState`, `RetentionPolicy`, `RecordQuery`, `ObservationQuery`.

## Dependencies
- Downstream implementers: `d1-store.ts` (Cloudflare D1 + R2). A
  SqliteStore/PgStore would implement the same interface for self-hosting.
- Upstream consumers: `sources/persist.ts`, `scheduler/scheduled.ts`,
  `routes/sources.ts`, `sources/types.ts` (re-uses `ObservationInput` /
  `RecordInput` / `RetentionPolicy` in `SourcePersistence`).

## Notes
- "Classify by storage SHAPE, not by topic" is the core idea: an open-ended set
  of unrelated domains (weather/agri/tweets/news/web pages) collapses to three
  shapes, so adding a new domain needs no new tables.
- Write rules (idempotent upsert, content-hash dedup, batch-atomic, never
  overwrite good data with an error) are documented in
  `private/docs/storage-architecture.md` and enforced in the implementation.

## Change history

### 2026-06-15 — created
- **Motivation**: the hub fetched every source live per request with zero
  storage, so it could not auto-update on a schedule or keep history for trend
  analysis, and had no plan for heterogeneous data types.
- **Goal**: one narrow storage interface covering numeric series, documents and
  large blobs, behind which D1/R2 (Cloudflare) and SQLite/Postgres (self-host)
  are interchangeable.
- **Key decision**: shape-based (not topic-based) modelling — two physical
  tables (`records` + `observations`) plus R2 blobs cover unlimited domains.
