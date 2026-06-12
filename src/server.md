# src/server.ts

## Responsibility
Custom Worker entry (referenced by `wrangler.json` `main`). Dispatches
`/api/*`, `/health` and `/mcp` to the Hono worker; everything else goes to
the TanStack Start default handler.

## Core exports / API
- `default { fetch(request, env, ctx) }`

## Dependencies
- Upstream: `wrangler.json` (`main: "src/server.ts"`)
- Downstream: `@tanstack/react-start/server-entry`, `./worker/api-worker`

## Notes
- TanStack Start resolves the custom server entry from `src/server.ts` and
  @cloudflare/vite-plugin uses wrangler's `main` — the old template files
  `src/server-entry.ts` / `src/ssr.tsx` are dead code that is never loaded.

## Change history

### 2026-06-12 — created
- **Motivation**: the template config left `/api/*` swallowed by the
  TanStack Router 404 page; the Hono worker never ran.
- **Key decision**: replicate NanoBee's proven fix — real entry at
  `src/server.ts`, wrangler `main` pointed at it.

### 2026-06-12 — dispatch /mcp; doc rewritten in English
- **Motivation**: the hub now exposes a standard MCP server endpoint, and
  public-repo docs must be English.
