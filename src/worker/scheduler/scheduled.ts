/**
 * Scheduled background refresh (Cloudflare Cron Trigger handler).
 *
 * Wired from `src/server.ts` `scheduled()`. The cron fires every 5 minutes;
 * each tick we walk every source that opted into a `schedule`, ask the market
 * calendar whether it's due, fetch it live, persist history + the cached
 * snapshot, and apply the source's retention policy.
 *
 * Self-hosting note: the same `runScheduled(env)` can be driven by node-cron in
 * a Docker deployment — it depends only on `getStore(env)` and the registry,
 * not on any Cloudflare-specific scheduling API.
 */

import { getStore } from "../storage";
import { persistResult } from "../sources/persist";
import { coerceParams, listScheduledSources } from "../sources/registry";
import { shouldRefresh } from "./market-calendar";

export async function runScheduled(env: unknown): Promise<void> {
	const store = getStore(env);
	if (!store) {
		console.warn("[cron] no DB binding; skipping scheduled refresh");
		return;
	}
	const now = new Date();
	const sources = listScheduledSources();
	console.log("[cron] tick:", sources.length, "scheduled source(s)");

	for (const source of sources) {
		const schedule = source.schedule;
		if (!schedule) continue;
		const state = await store.getSourceState(source.id);
		if (!shouldRefresh(schedule.cadence, state?.lastFetchAt, now)) continue;

		const paramSets = schedule.refreshParams();
		let snapshot: unknown = state?.lastResult;
		let ok = false;
		let lastErr: string | undefined;

		for (let i = 0; i < paramSets.length; i++) {
			try {
				const params = coerceParams(source.params, paramSets[i]);
				const result = await source.fetch(params, env);
				await persistResult(store, source, result);
				if (i === 0) snapshot = result; // first set is the canonical snapshot
				ok = true;
				console.log("[cron] refreshed", source.id, JSON.stringify(paramSets[i]));
			} catch (e) {
				lastErr = String(e);
				console.error("[cron] fetch failed", source.id, lastErr);
			}
		}

		// Write rules: never overwrite a good snapshot with an error; bump the
		// failure counter instead so we keep serving the last good data.
		await store.setSourceState({
			source: source.id,
			lastFetchAt: ok ? new Date().toISOString() : state?.lastFetchAt,
			lastCursor: state?.lastCursor,
			consecutiveFailures: ok ? 0 : (state?.consecutiveFailures ?? 0) + 1,
			lastError: ok ? undefined : lastErr,
			lastResult: snapshot,
		});

		if (source.persist?.retention) {
			try {
				const { deleted } = await store.applyRetention(source.id, source.persist.retention);
				if (deleted) console.log("[cron] retention", source.id, "deleted", deleted);
			} catch (e) {
				console.error("[cron] retention failed", source.id, String(e));
			}
		}
	}
}
