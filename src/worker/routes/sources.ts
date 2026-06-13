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
import {
	coerceParams,
	getSource,
	listSources,
	redactSecretParams,
} from "../sources/registry";

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

		try {
			const result = await source.fetch(params, c.env);
			return c.json(result);
		} catch (error) {
			console.error("[API] source fetch failed:", id, String(error));
			return c.json({ error: `Data source '${id}' failed`, detail: String(error) }, 502);
		}
	});
