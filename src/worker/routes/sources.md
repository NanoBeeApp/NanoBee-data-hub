# src/worker/routes/sources.ts

## Responsibility
Generic HTTP surface for the data-source registry — two endpoints serve
every source, no per-source routes.

## Core exports / API
- `sourceRoutes: Hono` mounted at `/api/sources`
  - `GET /api/sources` — catalog `{ sources: SourceDescriptor[] }`
  - `POST /api/sources/:id/fetch` — invoke a source with a JSON params body;
    404 unknown source, 502 (+detail) when the source throws

## Dependencies
- Upstream: mounted by `api-worker.ts`
- Downstream: `../sources/registry` (listSources/getSource/coerceParams)

## Notes
- Tolerates an empty/absent body (all-optional params).
- 502 with detail lets consumers degrade gracefully.

## Change history

### 2026-06-12 — created
- **Motivation**: unlimited sources must share one discovery + invocation
  surface; new sources appear in the catalog automatically.

### 2026-06-12 — doc rewritten in English
- **Motivation**: this is a public repository; all docs must be English.

### 2026-06-13 — redact secret params in logs
- **Motivation**: sources may declare `secret: true` params (API keys).
- **Goal**: fetch logging masks secret values via `redactSecretParams`.
