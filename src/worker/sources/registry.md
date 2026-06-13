# src/worker/sources/registry.ts

## Responsibility
Central registration of all data sources, plus discovery (`listSources`),
lookup (`getSource`) and parameter normalization (`coerceParams`) for the
HTTP layers. Adding a source = import it and append to `SOURCES`.

## Core exports / API
- `listSources(): SourceDescriptor[]` — the catalog (descriptors only)
- `getSource(id): DataSource | undefined`
- `coerceParams(declared, raw)` — coerce raw values to declared types and
  apply defaults

## Dependencies
- Upstream: `routes/sources.ts`, `routes/mcp.ts`
- Downstream: `./types`, source modules (`./hackernews`, ...)

## Notes
- `Map`-backed id lookup; `coerceParams` centralizes parsing so each
  source's `fetch` stays business-only.

## Change history

### 2026-06-12 — created
- **Motivation**: avoid one bespoke route per source; consumers discover
  sources through the catalog instead of hardcoding ids.
- **Key decision**: registry + generic HTTP surface — zero route changes per
  new source.

### 2026-06-12 — doc rewritten in English
- **Motivation**: this is a public repository; all docs must be English.

### 2026-06-13 — websearch registered + `redactSecretParams`
- **Motivation**: the Tavily source carries a secret param; gateway logs must
  never contain credential values.
- **Goal**: register `webSearch`; export `redactSecretParams(declared,
  params)` used by both HTTP surfaces before logging.
