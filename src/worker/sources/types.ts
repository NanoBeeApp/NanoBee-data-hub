/**
 * Data-source registry contracts.
 *
 * The data hub is a gateway over an open-ended set of public data sources
 * (Hacker News, weather, stocks, gold, ISS, ...). To avoid hardcoding a
 * bespoke route per source, every source implements this one narrow
 * interface and is dropped into the registry. The HTTP layer then exposes
 * the whole catalog generically:
 *   - GET  /api/sources            -> discover what exists (LLM-readable)
 *   - POST /api/sources/:id/fetch  -> invoke one by id with params
 *
 * Adding a new data source = add one module implementing `DataSource` and
 * register it. No new routes, no consumer-side changes.
 */

import type { ObservationInput, RecordInput, RetentionPolicy } from "../storage/types";

/** One declared parameter a source accepts (drives both validation and the
 *  machine-readable schema consumers feed to an LLM for tool selection). */
export interface SourceParam {
	name: string;
	type: "string" | "number" | "boolean";
	description: string;
	required?: boolean;
	/** Allowed values, when the param is an enumeration. */
	enum?: string[];
	/** Default applied when the caller omits the param. */
	default?: string | number | boolean;
	/**
	 * Marks a credential-bearing param (e.g. an API key). Secret values are
	 * redacted from gateway logs, and consumers should inject them
	 * server-side instead of exposing them to an LLM.
	 */
	secret?: boolean;
}

/** Public, LLM-readable description of a source (no fetch logic). */
export interface SourceDescriptor {
	id: string;
	name: string;
	/** What this source returns and when to use it — read by the router LLM. */
	description: string;
	params: SourceParam[];
}

/** Normalized payload every source returns. `items` stays source-shaped, but
 *  `summary` gives consumers a ready-to-inject, human-readable digest. */
export interface SourceResult {
	source: string;
	fetchedAt: string;
	/** Compact text digest suitable for splicing into an LLM prompt. */
	summary: string;
	items: unknown[];
}

/** How often the scheduler refreshes a source. `market` = US-market-hours aware. */
export type Cadence = "market" | "daily" | "hourly";

/**
 * Optional persistence behaviour. A source that sets this is captured into the
 * store on every fetch (scheduled or on-demand), and its latest result can be
 * served from cache by the read path. `shape` picks the storage form:
 *   - "observations": numeric time-series (provide `toObservations`)
 *   - "records":      documents/feed/web (provide `toRecords`)
 */
export interface SourcePersistence {
	shape: "observations" | "records";
	retention?: RetentionPolicy;
	toObservations?(result: SourceResult): ObservationInput[];
	toRecords?(result: SourceResult): RecordInput[];
	/**
	 * Whether the cached snapshot may serve a given request. Defaults to "only
	 * when the caller passed no narrowing params" (see sources/persist.ts).
	 */
	snapshotEligible?(raw: Record<string, unknown>): boolean;
}

/** Optional scheduled-refresh behaviour. Omit to leave a source on-demand only. */
export interface SourceSchedule {
	cadence: Cadence;
	/**
	 * The param set(s) to fetch on each scheduled tick. The FIRST set is treated
	 * as the canonical snapshot served by the cached read path.
	 */
	refreshParams(): Record<string, string | number | boolean>[];
}

/** A registered data source: its descriptor plus how to fetch (and persist) it. */
export interface DataSource extends SourceDescriptor {
	/**
	 * Fetch live data. `params` has already been coerced/defaulted against
	 * `this.params`. `env` exposes Worker bindings for sources that need them.
	 */
	fetch(params: Record<string, string | number | boolean>, env: unknown): Promise<SourceResult>;
	/** Opt into persistence (history + cached snapshot). */
	persist?: SourcePersistence;
	/** Opt into scheduled background refresh. */
	schedule?: SourceSchedule;
}
