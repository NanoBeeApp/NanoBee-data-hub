/**
 * Custom server entry (referenced by wrangler.json "main").
 *
 * Dispatches /api/* and /health to the Hono API worker; everything else is
 * handled by the default TanStack Start handler (SSR + server functions).
 *
 * NOTE: @tanstack/react-start resolves the custom server entry from
 * `src/server.ts` and @cloudflare/vite-plugin uses wrangler.json's `main`.
 * The old `src/server-entry.ts` / `src/ssr.tsx` template files were never
 * loaded — this file is the real entry. See the project memory note
 * "TanStack Start + Cloudflare server entry".
 */

import handler from "@tanstack/react-start/server-entry";
import apiWorker from "./worker/api-worker";
import { runScheduled } from "./worker/scheduler/scheduled";

export default {
	// Cloudflare Cron Trigger entry — see wrangler.json "triggers.crons".
	// Walks every scheduled source, refreshes the due ones, persists history.
	async scheduled(_event: unknown, env: unknown, ctx: { waitUntil(p: Promise<unknown>): void }) {
		ctx.waitUntil(runScheduled(env));
	},

	async fetch(request: Request, env: unknown, ctx: unknown) {
		const url = new URL(request.url);

		if (
			url.pathname.startsWith("/api") ||
			url.pathname === "/health" ||
			url.pathname === "/mcp"
		) {
			return apiWorker.fetch(request, env as never, ctx as never);
		}

		// The published type only declares (request), but at runtime the Start
		// handler forwards all worker arguments — pass them through so bindings
		// stay available to server functions.
		return (handler.fetch as (...args: unknown[]) => Promise<Response>)(
			request,
			env,
			ctx,
		);
	},
};
