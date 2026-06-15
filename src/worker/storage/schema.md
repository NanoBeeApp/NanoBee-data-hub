# src/worker/storage/schema.sql

## Responsibility
D1 / SQLite DDL for the storage layer. Idempotent (`IF NOT EXISTS` throughout),
safe to re-run. Apply with:
`wrangler d1 execute <db> --local|--remote --file=./src/worker/storage/schema.sql`

## Tables
- `records` — documents / feed items / web-page metadata; unique
  `(source, item_key)`; large payloads referenced via `blob_key`.
- `records_fts` — standalone FTS5 over `title/summary/body`, kept at
  `rowid == records.id` by the store.
- `observations` — numeric time-series; PK `(source, series_key, ts)`.
- `source_state` — per-source ingest bookkeeping + `last_result_json` (the
  cached snapshot served by the read path).

## Notes
- Two physical data tables (`records` + `observations`) cover all three storage
  shapes; new domains need no schema change.
- Indexes target the hot read patterns: latest-by-source for records, and
  by-source-time for observations.

## Change history

### 2026-06-15 — created
- **Motivation**: persistence for scheduled refresh + history + FTS.
- **Goal**: minimal schema covering time-series, documents, blobs, state.
- **Key decision**: standalone FTS5 (not external-content) so the store can
  DELETE/INSERT by explicit rowid without the external-content sync footguns.
