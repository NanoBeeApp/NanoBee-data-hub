# src/worker/sources/webpage.ts

## Responsibility
Fetch any caller-supplied URL and extract readable text from the resulting HTML.
Answers questions like "read this link", "summarise this page", 抓取网页 /
网页内容 / 读取链接 / 网页正文 / 提取网页文字. The raw HTML is stored in the
blob store (R2) so it can be recovered later; the extracted text (≤ 20 000 chars)
is FTS-indexed in D1 for full-text search without re-fetching.

## Core exports / API
- `webpage: DataSource` — id `webpage`; required string `url` param.
  `fetch()` issues an HTTP GET with a browser-like User-Agent, reads the response
  body as text, extracts the title and readable text (script/style/noscript blocks
  removed, tags stripped, entities decoded, whitespace collapsed, capped at 20 000
  chars), and returns a one-line `summary` plus a single-element `items` array
  `[{ url, title, textLength, text }]`.

## API
- **Endpoint**: caller-supplied URL (no fixed upstream base). No API key required.
- **Method**: `GET` with `User-Agent: Mozilla/5.0 (compatible; NanoBee/1.0; +https://nanobee.app)`.
- **Timeout**: `AbortSignal.timeout(12_000)` (12 s).
- **Error conditions**: throws on invalid URL, disallowed protocol or private host
  (SSRF protection), content-length > 5 MB, unsupported content-type, non-2xx
  (`res.ok` check), empty body, or zero extractable text (e.g. JS-only SPAs).
- **Persist shape**: `records`; `itemKey` = `url`; `blob.data` = raw HTML string
  (routed to R2 by the storage layer — this module never touches `env.BLOBS`);
  `blob.contentType` = the actual `content-type` header value from the response
  (falls back to `"text/html"` if the header is absent);
  `body` = extracted text (D1 FTS); retention 60 days.
- **snapshotEligible**: always `false` — `url` is always a narrowing param, so a
  cached snapshot for a prior URL must never be served.
- **Schedule**: none — on-demand only.

## Dependencies
- Upstream: `registry.ts` (SOURCES), `routes/sources.ts` (generic catalog + invoke).
- Downstream: the target URL supplied by the caller; no fixed third-party API.
- Storage: `RecordInput.blob` routed to R2 by `DataStore.putRecords`; `body` to
  D1 FTS. This module only assembles `RecordInput` — the storage adapter does the
  routing.

## Notes
- **SSRF protection**: `fetch()` validates the URL with `new URL()` before making
  any network request. Only `http:` and `https:` protocols are allowed. The
  hostname is rejected if it matches `localhost`, `0.0.0.0`, `127.x`, `::1`,
  `169.254.x` (cloud metadata), RFC-1918 private ranges (`10.x`, `192.168.x`,
  `172.16–31.x`), or the catch-all `0.0.0.0`. This blocks SSRF attacks that
  would otherwise let a caller probe internal services or cloud metadata APIs.
- **Response size cap**: if the `content-length` response header is present and
  exceeds 5 000 000 bytes (5 MB), the request is rejected before reading the body.
- **Content-type restriction**: only `text/html`, `application/xhtml+xml`,
  `text/xml`, and `application/xml` responses are accepted (matched on the base
  type, stripping any `; charset=...` suffix). Other types (PDF, images, JSON,
  binary) are rejected with a clear error.
- The HTML extraction pipeline is pure string operations (regex), with no DOM
  parser dependency — safe in Cloudflare Workers, browser, and Node without a
  `jsdom`/`linkedom` package.
- Raw HTML and the actual content-type are passed from `fetch()` to
  `persist.toRecords()` via a module-private
  `WeakMap<SourceResult, { html: string; contentType: string }>` so the public
  `SourceResult` shape stays clean and the data is GC-eligible once result is
  dropped.
- **Entity decoding**: a shared `decodeEntities()` helper handles named entities
  (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&nbsp;`) and numeric refs —
  both decimal (`&#160;`) and hex (`&#x26;` / `&#XA0;`). Invalid code points are
  silently dropped. Used in both title and body extraction.
- JS-only SPAs that render no server-side HTML will produce little or no
  extractable text; the source throws in that case rather than persisting an empty
  record.
- Title extraction uses `/<title[^>]*>([\s\S]*?)<\/title>/i` and runs the result
  through `decodeEntities()`; returns `""` when absent.

## Change history

### 2026-06-15 — created
- **Motivation**: NanoBee users frequently share URLs in chat and ask the agent to
  read or summarise the page content. Without a `webpage` tool the agent had no
  structured way to fetch and index arbitrary URLs — it could only reply that it
  cannot browse the web.
- **Goal**: a data-hub source that fetches any URL on demand, extracts readable
  text, stores the raw HTML in R2, and FTS-indexes the text in D1 so downstream
  agents can search previously fetched pages without re-fetching.
- **Key decision**: pure-regex HTML extraction (no DOM parser) keeps the
  implementation dependency-free and safe in every runtime (Workers, browser,
  Node). A `WeakMap` carries raw HTML from `fetch()` to `persist.toRecords()`
  without polluting the public `SourceResult` shape. `snapshotEligible: () =>
  false` is mandatory because `url` is always a narrowing param — serving a cached
  snapshot for a different URL would be a correctness bug.
- **Security hardening (same date, post-creation review)**:
  - Added SSRF validation (protocol allow-list + private-host block-list) before
    any network I/O.
  - Added 5 MB response size cap (header-based, pre-body-read).
  - Added content-type guard: only HTML/XHTML/XML accepted; actual content-type
    value now stored in `blob.contentType` instead of the former hardcoded
    `"text/html"`.
  - Extracted `decodeEntities()` shared helper; now handles `&#39;` and numeric
    hex refs (`&#x26;`/`&#XA0;`) in addition to the prior named + decimal set;
    used in both title and body extraction.
  - Moved `_rawHtmlStore` WeakMap declaration to the top of the module
    (before helpers and export) for declare-before-use clarity; its value type
    changed from `string` to `{ html: string; contentType: string }`.
