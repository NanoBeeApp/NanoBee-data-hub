# src/worker/sources/news.ts

## Responsibility
Latest financial and market news data source. Pulls headlines from Finnhub's
free general-news endpoint (`/api/v1/news?category=general`) and returns up to
40 recent articles so the agent can answer questions like "最新财经新闻" /
"市场新闻" / "科技新闻" / "金融新闻" / "market news" with live headlines
instead of apologising that it cannot access the internet.

## Core exports / API
- `news: DataSource` — id `news`; optional `category` param (`general` |
  `forex` | `crypto` | `merger`, defaults to `general`). `fetch()` calls
  Finnhub `/api/v1/news`, caps to 40 items (Finnhub orders newest-first), and
  returns a compact headline digest as `summary` plus raw items.

## Dependencies
- Upstream: `registry.ts` (registered in `SOURCES`), `routes/sources.ts`
  (generic catalog + invoke surface).
- Downstream: Finnhub REST API (`finnhub.io`); `env.FINNHUB_KEY`
  (project-level credential — this is the **first and currently only**
  Finnhub credential consumer in this project; econ-calendar uses the
  keyless `faireconomy.media` endpoint and requires no API key).

## Notes
- The Finnhub key is read from `env.FINNHUB_KEY`, never exposed as a
  model-visible param.
- `itemKey` for storage dedup: `String(item.id)` when `id` is a positive
  integer, falling back to `item.url` or a composite of `datetime|headline` so
  records are always idempotent-upsertable even if `id` is absent.
- `tags` contains the article source name and category (both non-empty strings
  only), enabling tag-based filtering in future search queries.
- Capped to 40 items to keep the prompt and the per-tick storage write
  reasonably sized; the upstream often returns more.
- 14-day raw retention (`rawTtlDays: 14`) — news is short-lived; older
  articles become irrelevant quickly.
- `toIso()` converts Finnhub's Unix-seconds `datetime` to ISO 8601 for the
  `ts` field; when `datetime` is 0, absent, or negative the field is omitted so
  the store falls back to ingest time rather than persisting a sentinel date.

## Change history

### 2026-06-15 — created
- **Motivation**: the data-hub shipped `hackernews`, `websearch`, `gold`,
  `stocks`, and `econ_calendar`, but there was no general financial / market
  news source, so the agent fell back to apologising when asked for "最新财经
  新闻" or "market news".
- **Goal**: add a structured news source backed by Finnhub's free `/news`
  endpoint so the agent gains a `datahub_news` tool and can surface live
  headlines across four categories (general, forex, crypto, merger).
- **Key decision**: project-level `FINNHUB_KEY` via `env` (this source is the
  first Finnhub credential consumer in the project; econ-calendar is keyless
  and uses `faireconomy.media`); `persist.shape: "records"` for FTS-able
  article search; `schedule.cadence: "hourly"` for reasonably fresh cache
  without hammering the free tier; cap to 40 items both in the fetch result and
  in `toRecords` to keep prompt and storage cost predictable.
