# src/worker/sources/websearch.ts

## Responsibility
Provider-agnostic web search data source. The model sees one "web search" tool;
the backend is chosen server-side from whichever credential the caller injects:
Tavily, Brave Search, Serper (Google) or Exa. Every provider response is
normalized to the same `{ answer?, items }` shape.

## Core exports / API
- `webSearch: DataSource` — id `websearch`
- Model-visible params: `query` (required), `max_results` (1-10, default 5),
  `topic` (`general` | `news`, optional)
- Secret params (all optional, `secret: true`, never model-visible — the caller
  injects exactly one): `tavily_api_key`, `brave_api_key`, `serper_api_key`,
  `exa_api_key`. Provider is picked in order tavily → brave → serper → exa by
  first key present.
- Returns `SourceResult`: `items` of `{title, url, snippet, score}`; `summary`
  names the chosen provider, includes a direct `answer` when the provider
  supplies one (Tavily / Serper answer box), plus numbered results with
  300-char snippets.

## Dependencies
- Upstream: registered in `registry.ts`
- Downstream: `./types`; Tavily / Brave / Serper / Exa search APIs

## Notes
- The hub holds no credential of its own: this is a public repository and the
  services are per-user keyed, so keys always arrive as (redacted-in-logs)
  secret params. Consumers (e.g. NanoBee) resolve per-user keys and inject
  exactly one server-side based on the user's chosen provider.
- 15s timeout per request; results without title/url are dropped; Brave/Serper
  HTML snippet tags are stripped.

## Change history

### 2026-06-13 — created
- **Motivation**: give the agent live web-search capability; per-user Tavily
  keys are entered in NanoBee's AI settings dialog with a built-in default.
- **Key decision**: model the credential as a declared `secret` param instead
  of hub-side configuration — keeps the public hub credential-free and lets
  each consumer bring its own key resolution.
