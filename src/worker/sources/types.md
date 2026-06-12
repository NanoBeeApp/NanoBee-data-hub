# src/worker/sources/types.ts

## Responsibility
Contracts for the data-source registry: the `DataSource` interface, the
`SourceParam` declaration, the LLM-readable `SourceDescriptor`, and the
normalized `SourceResult`. This is the foundation of "no hardcoded routes,
unlimited sources".

## Core exports / API
- `SourceParam` — one declared parameter (name/type/description/required/
  enum/default); drives both validation and the machine-readable schema fed
  to LLMs for tool selection
- `SourceDescriptor` — public description of a source (no fetch logic)
- `SourceResult` — normalized return (`source`/`fetchedAt`/`summary`/`items`);
  `summary` is a prompt-ready text digest
- `DataSource` — descriptor + `fetch(params, env)`

## Dependencies
- Upstream: `registry.ts`, source modules (e.g. `hackernews.ts`),
  `routes/sources.ts`, `routes/mcp.ts`
- Downstream: none

## Notes
- `summary` is the key field: consumers can splice it straight into an LLM
  prompt without understanding each source's `items` shape.

## Change history

### 2026-06-12 — created
- **Motivation**: the consumer (NanoBee) needed HN data, but sources are
  open-ended — one narrow interface must carry them all, with the HTTP layer
  staying generic (catalog + invoke).
- **Key decision**: normalize every source's output around a prompt-ready
  `summary` so consumers integrate at zero per-source cost.

### 2026-06-12 — doc rewritten in English
- **Motivation**: this is a public repository; all docs must be English.
