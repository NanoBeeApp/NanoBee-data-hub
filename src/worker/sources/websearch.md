# src/worker/sources/websearch.ts

## Responsibility
Web search data source backed by the Tavily Search API (`POST
https://api.tavily.com/search`, Bearer auth).

## Core exports / API
- `webSearch: DataSource` — id `websearch`
- Params: `query` (required), `max_results` (1-10, default 5), `topic`
  (`general` | `news`, optional), `tavily_api_key` (**required, `secret:
  true`** — injected by the caller, never by a model)
- Returns `SourceResult`: `items` of `{title, url, snippet, score}`;
  `summary` includes Tavily's direct `answer` when present plus numbered
  results with 300-char snippets

## Dependencies
- Upstream: registered in `registry.ts`
- Downstream: `./types`, Tavily API

## Notes
- The hub holds no Tavily credential: this is a public repository and the
  service is per-user keyed, so the key always arrives as a (redacted-in-logs)
  secret param. Consumers (e.g. NanoBee) resolve per-user keys and inject
  them server-side.
- 15s timeout; results without title/url are dropped.

## Change history

### 2026-06-13 — created
- **Motivation**: give the agent live web-search capability; per-user Tavily
  keys are entered in NanoBee's AI settings dialog with a built-in default.
- **Key decision**: model the credential as a declared `secret` param instead
  of hub-side configuration — keeps the public hub credential-free and lets
  each consumer bring its own key resolution.
