-- data-hub storage schema (D1 / SQLite).
-- Three storage shapes behind one schema; see private/docs/storage-architecture.md.
-- Idempotent: safe to run repeatedly (IF NOT EXISTS everywhere).

-- Shape B/C: documents / feed items / web-page metadata.
-- One row per (source, item_key); large payloads live in the blob store and are
-- referenced by `blob_key`.
CREATE TABLE IF NOT EXISTS records (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source        TEXT NOT NULL,
  item_key      TEXT NOT NULL,
  ts            TEXT,                 -- event time (ISO); null -> use fetched_at
  title         TEXT,
  summary       TEXT,
  body          TEXT,                 -- full text mirrored into FTS
  url           TEXT,
  lang          TEXT,
  tags          TEXT,                 -- JSON array
  payload_json  TEXT,                 -- small structured fields
  blob_key      TEXT,                 -- object-store key when payload is large
  content_hash  TEXT NOT NULL,        -- change detection / blob dedup
  first_seen    TEXT NOT NULL,
  last_seen     TEXT NOT NULL,
  fetched_at    TEXT NOT NULL,
  UNIQUE (source, item_key)
);
CREATE INDEX IF NOT EXISTS idx_records_source_ts ON records (source, ts DESC);
CREATE INDEX IF NOT EXISTS idx_records_source_seen ON records (source, last_seen DESC);

-- Full-text index over record text (FTS5). Standalone (not external-content)
-- so we can DELETE/INSERT by explicit rowid; we keep `rowid` == `records.id`
-- and resync it on every changed upsert (delete-then-insert).
CREATE VIRTUAL TABLE IF NOT EXISTS records_fts USING fts5 (title, summary, body);

-- Shape A: numeric time-series. One row per (source, series_key, ts).
CREATE TABLE IF NOT EXISTS observations (
  source      TEXT NOT NULL,
  series_key  TEXT NOT NULL,
  ts          TEXT NOT NULL,         -- event time (ISO)
  value       REAL NOT NULL,
  dims_json   TEXT,                  -- extra dimensions as JSON
  fetched_at  TEXT NOT NULL,
  PRIMARY KEY (source, series_key, ts)
);
CREATE INDEX IF NOT EXISTS idx_obs_source_ts ON observations (source, ts DESC);

-- Per-source ingest bookkeeping + latest rendered result for read-through.
CREATE TABLE IF NOT EXISTS source_state (
  source                TEXT PRIMARY KEY,
  last_fetch_at         TEXT,
  last_cursor           TEXT,
  consecutive_failures  INTEGER NOT NULL DEFAULT 0,
  last_error            TEXT,
  last_result_json      TEXT
);
