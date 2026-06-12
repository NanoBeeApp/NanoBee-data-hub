# src/worker/sources/hackernews.ts

## Responsibility
Hacker News data source backed by the public Algolia HN Search API (no key
required): front-page stories by default, keyword full-text search via
`query`.

## Core exports / API
- `hackerNews: DataSource` — id `hackernews`
- Params: `query` (optional keyword; omit for the front page), `limit`
  (1-30, default 10)
- Returns `SourceResult`: `items` of
  `{title, url, author, points, comments, createdAt}`; `summary` is a
  numbered prompt-ready digest

## Dependencies
- Upstream: registered in `registry.ts`
- Downstream: `./types`, Algolia HN API (`https://hn.algolia.com/api/v1`)

## Notes
- No `query` → `tags=front_page` (today's trending ≈ the front page); with
  `query` → `tags=story` full-text search.
- 10s timeout; hits without a title are dropped; missing URLs fall back to
  the HN item page.

## Change history

### 2026-06-12 — created
- **Motivation**: first concrete source for the registry — answering
  "what developer news is on HN today".
- **Key decision**: Algolia's `front_page` endpoint matches the "today's
  hot" semantics best and needs no API key.

### 2026-06-12 — doc rewritten in English
- **Motivation**: this is a public repository; all docs must be English.
