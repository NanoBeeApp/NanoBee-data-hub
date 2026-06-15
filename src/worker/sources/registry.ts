/**
 * Data-source registry.
 *
 * The single place every data source is registered. Consumers discover
 * sources through `listSources()` / `getSource()` rather than hardcoding
 * source ids, so the gateway scales to an open-ended number of sources
 * without touching the HTTP layer.
 *
 * To add a source: implement `DataSource` in a sibling module and append it
 * to `SOURCES` below — nothing else changes.
 */

import { econCalendar } from "./econ-calendar";
import { gold } from "./gold";
import { hackerNews } from "./hackernews";
import { stocks } from "./stocks";
import { webSearch } from "./websearch";
import type { DataSource, SourceDescriptor, SourceParam } from "./types";

const SOURCES: DataSource[] = [hackerNews, webSearch, gold, stocks, econCalendar];

const BY_ID = new Map(SOURCES.map((s) => [s.id, s]));

/** Public catalog: descriptors only (no fetch logic). */
export function listSources(): SourceDescriptor[] {
	return SOURCES.map(({ id, name, description, params }) => ({
		id,
		name,
		description,
		params,
	}));
}

/** Look up a source by id, or undefined when unknown. */
export function getSource(id: string): DataSource | undefined {
	return BY_ID.get(id);
}

/** Sources that opted into scheduled background refresh (have a `schedule`). */
export function listScheduledSources(): DataSource[] {
	return SOURCES.filter((s) => s.schedule);
}

/** Copy of `params` with secret values masked, safe for logging. */
export function redactSecretParams(
	declared: SourceParam[],
	params: Record<string, unknown>,
): Record<string, unknown> {
	const secretNames = new Set(declared.filter((p) => p.secret).map((p) => p.name));
	if (secretNames.size === 0) return params;
	const out: Record<string, unknown> = { ...params };
	for (const name of secretNames) {
		if (out[name] !== undefined) out[name] = "***";
	}
	return out;
}

/**
 * Coerce raw string/JSON params to the types each source declares and apply
 * declared defaults. Keeps per-source `fetch` implementations free of parsing.
 */
export function coerceParams(
	declared: SourceParam[],
	raw: Record<string, unknown>,
): Record<string, string | number | boolean> {
	const out: Record<string, string | number | boolean> = {};
	for (const p of declared) {
		const v = raw[p.name];
		if (v === undefined || v === null || v === "") {
			if (p.default !== undefined) out[p.name] = p.default;
			continue;
		}
		if (p.type === "number") {
			const n = typeof v === "number" ? v : Number(v);
			if (!Number.isNaN(n)) out[p.name] = n;
		} else if (p.type === "boolean") {
			out[p.name] = v === true || v === "true" || v === "1";
		} else {
			out[p.name] = String(v);
		}
	}
	return out;
}
