/**
 * Shared persistence helpers used by both the scheduler (background refresh)
 * and the HTTP read path (write-through on on-demand fetches).
 *
 * Keeping this here — not in routes or scheduler — avoids a circular import and
 * gives one place that knows how a `SourceResult` maps into the store.
 */

import type { DataStore } from "../storage/types";
import type { DataSource, SourceResult } from "./types";

/** Persist a fetched result into history (observations or records) per the source's `persist` shape. */
export async function persistResult(store: DataStore, source: DataSource, result: SourceResult): Promise<void> {
	const p = source.persist;
	if (!p) return;
	if (p.shape === "observations" && p.toObservations) {
		const obs = p.toObservations(result);
		if (obs.length) await store.putObservations(obs);
	}
	if (p.shape === "records" && p.toRecords) {
		const recs = p.toRecords(result);
		if (recs.length) await store.putRecords(recs);
	}
}

/**
 * Whether the cached snapshot in `source_state.last_result` may serve a request.
 * Defaults to "only when the caller did not narrow the request with params",
 * because the snapshot is produced by the source's canonical (default) call.
 */
export function snapshotEligible(source: DataSource, raw: Record<string, unknown>): boolean {
	if (!source.persist) return false;
	if (source.persist.snapshotEligible) return source.persist.snapshotEligible(raw);
	return Object.keys(raw ?? {}).length === 0;
}
