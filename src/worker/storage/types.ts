/**
 * Storage adapter contracts for the data hub.
 *
 * The hub ingests an open-ended set of UNRELATED data domains (trading,
 * weather, agriculture, news, tweets, raw web pages, ...). Rather than model
 * each domain with bespoke tables, everything is classified by STORAGE SHAPE:
 *
 *   A. Time-series / metrics  -> `ObservationInput`  (numeric, sampled over time)
 *   B. Documents / feed items -> `RecordInput`       (news/tweets/search hits, FTS-able)
 *   C. Large blobs            -> `RecordInput.blob`   (web page HTML/text -> object store)
 *
 * Business code depends only on the narrow `DataStore` interface below, so the
 * same logic runs on Cloudflare (D1 + R2) and self-hosted (SQLite/Postgres +
 * filesystem/MinIO) — only the implementation behind `getStore()` changes.
 */

/** Per-source data-lifecycle policy applied on the write side (see scheduler). */
export interface RetentionPolicy {
	/** Delete records/observations whose `ts` is older than this many days. */
	rawTtlDays?: number;
}

/**
 * Shape A — one numeric time-series point. Uniquely identified by
 * (source, seriesKey, ts); a re-fetch of the same instant upserts, never dupes.
 */
export interface ObservationInput {
	source: string;
	/** Series identity, e.g. "QQQ.close", "weather.beijing.temp". */
	seriesKey: string;
	/** Event time (ISO string) — when the data point is ABOUT. */
	ts: string;
	value: number;
	/** Extra non-numeric dimensions, stored as JSON. */
	dims?: Record<string, unknown>;
}

/**
 * Shape B/C — a document/feed record. Uniquely identified by (source, itemKey).
 * Large payloads go to the blob store via `blob`; only the pointer is indexed.
 */
export interface RecordInput {
	source: string;
	/** Dedup key within the source: url / guid / tweet-id / "__latest__". */
	itemKey: string;
	/** Event time (ISO). Defaults to ingest time when omitted. */
	ts?: string;
	title?: string;
	summary?: string;
	/** Full text for FTS (article body, extracted web-page text). */
	body?: string;
	url?: string;
	lang?: string;
	tags?: string[];
	/** Small structured fields (< ~100 KB) stored inline as JSON. */
	payload?: unknown;
	/** Large opaque payload (e.g. raw HTML) — routed to the object store. */
	blob?: { contentType: string; data: ArrayBuffer | Uint8Array | string };
}

export interface StoredRecord {
	source: string;
	itemKey: string;
	ts: string | null;
	title: string | null;
	summary: string | null;
	url: string | null;
	lang: string | null;
	tags: string[];
	payload: unknown;
	blobKey: string | null;
	contentHash: string;
	firstSeen: string;
	lastSeen: string;
	fetchedAt: string;
}

export interface StoredObservation {
	source: string;
	seriesKey: string;
	ts: string;
	value: number;
	dims: Record<string, unknown> | null;
	fetchedAt: string;
}

/** Per-source ingest bookkeeping + the latest rendered result for read-through. */
export interface SourceState {
	source: string;
	lastFetchAt?: string;
	lastCursor?: string;
	consecutiveFailures: number;
	lastError?: string;
	/** The most recent successful `SourceResult`, served by the cached read path. */
	lastResult?: unknown;
}

export interface RecordQuery {
	source: string;
	limit?: number;
	/** Only records with `ts` (or last_seen) at/after this ISO instant. */
	since?: string;
}

export interface ObservationQuery {
	source: string;
	seriesKey?: string;
	limit?: number;
	since?: string;
}

/**
 * The one storage interface every backend implements. All writes follow the
 * write rules documented in private/docs/storage-architecture.md: idempotent
 * upsert-by-key, content-hash change detection, batch-atomic, never overwrite
 * good data with an error.
 */
export interface DataStore {
	/** Upsert documents/feed records (shape B/C). Returns how many were written. */
	putRecords(records: RecordInput[]): Promise<{ written: number; skipped: number }>;
	/** Upsert numeric time-series points (shape A). */
	putObservations(obs: ObservationInput[]): Promise<{ written: number }>;
	getRecords(q: RecordQuery): Promise<StoredRecord[]>;
	getObservations(q: ObservationQuery): Promise<StoredObservation[]>;
	/** Full-text search across record title/summary/body. */
	searchRecords(query: string, opts?: { source?: string; limit?: number }): Promise<StoredRecord[]>;
	/** Fetch a stored blob by its key (the `blob_key` on a record). */
	getBlob(blobKey: string): Promise<{ data: ArrayBuffer; contentType: string } | null>;
	getSourceState(source: string): Promise<SourceState | null>;
	setSourceState(state: SourceState): Promise<void>;
	/** Apply a source's retention policy (delete-only in v1). */
	applyRetention(source: string, policy: RetentionPolicy): Promise<{ deleted: number }>;
}
