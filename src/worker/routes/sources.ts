/**
 * Generic data-source HTTP surface.
 *
 * Two endpoints serve every source in the registry — no per-source route:
 *   GET  /api/sources            -> catalog of available sources (for discovery
 *                                   / LLM tool-selection)
 *   POST /api/sources/:id/fetch  -> invoke one source by id with JSON params
 *
 * This is what keeps the gateway open-ended: new sources show up here
 * automatically once registered.
 */

import { Hono } from "hono";
import type { Env } from "../api-worker";
import { persistResult, snapshotEligible } from "../sources/persist";
import {
	coerceParams,
	getSource,
	listSources,
	redactSecretParams,
} from "../sources/registry";
import { getStore } from "../storage";

export const sourceRoutes = new Hono<{ Bindings: Env }>()
	// GET /api/sources — discover the catalog
	.get("/", (c) => {
		console.log("[API] GET /api/sources");
		return c.json({ sources: listSources() });
	})

	// POST /api/sources/:id/fetch — invoke a source by id
	.post("/:id/fetch", async (c) => {
		const id = c.req.param("id");
		const source = getSource(id);
		if (!source) {
			console.warn("[API] POST /api/sources/:id/fetch — unknown source:", id);
			return c.json({ error: `Unknown data source: ${id}` }, 404);
		}

		// Accept params from the JSON body; tolerate an empty/absent body.
		let raw: Record<string, unknown> = {};
		try {
			const body = await c.req.json<Record<string, unknown>>();
			if (body && typeof body === "object") raw = body;
		} catch {
			raw = {};
		}

		const params = coerceParams(source.params, raw);
		console.log(
			"[API] POST /api/sources/%s/fetch, params:",
			id,
			JSON.stringify(redactSecretParams(source.params, params)),
		);

		const fresh = c.req.query("fresh") === "true";
		const store = getStore(c.env);

		// Cached read-through: serve the last scheduled snapshot when the source
		// is persisted, the caller didn't pass narrowing params, and we have one.
		if (!fresh && store && source.persist && snapshotEligible(source, raw)) {
			try {
				const state = await store.getSourceState(id);
				if (state?.lastResult) {
					console.log("[API] cache hit for", id, "cachedAt:", state.lastFetchAt);
					return c.json({ ...(state.lastResult as object), fromCache: true, cachedAt: state.lastFetchAt ?? null });
				}
			} catch (e) {
				console.warn("[API] cache read failed, falling back to live:", id, String(e));
			}
		}

		try {
			const result = await source.fetch(params, c.env);

			// Write-through: on-demand fetches also populate history (and refresh the
			// snapshot when this is the canonical call). Best-effort, off the response
			// path so it never slows or fails the request.
			if (store && source.persist) {
				const eligible = snapshotEligible(source, raw);
				const writeThrough = async () => {
					try {
						await persistResult(store, source, result);
						if (eligible) {
							const prev = await store.getSourceState(id);
							await store.setSourceState({
								source: id,
								lastFetchAt: new Date().toISOString(),
								lastCursor: prev?.lastCursor,
								consecutiveFailures: 0,
								lastResult: result,
							});
						}
					} catch (e) {
						console.error("[API] write-through failed:", id, String(e));
					}
				};
				const ctx = safeExecutionCtx(c);
				if (ctx?.waitUntil) ctx.waitUntil(writeThrough());
				else await writeThrough();
			}

			return c.json(result);
		} catch (error) {
			console.error("[API] source fetch failed:", id, String(error));
			return c.json({ error: `Data source '${id}' failed`, detail: String(error) }, 502);
		}
	});

/** Access `executionCtx` without throwing in runtimes that don't provide it. */
function safeExecutionCtx(c: { executionCtx?: { waitUntil?: (p: Promise<unknown>) => void } }) {
	try {
		return c.executionCtx;
	} catch {
		return undefined;
	}
}
