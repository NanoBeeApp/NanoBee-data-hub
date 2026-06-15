# src/worker/sources/crypto.ts

## Responsibility
Cryptocurrency spot price data source. Returns the current USD price and
24-hour percentage change for each requested coin, so chat questions like
"比特币现价" / "以太坊多少钱" / "BTC price" / "加密货币行情" can be answered
with live data instead of the model falling back to outdated training knowledge.

## Core exports / API
- `cryptoPrices: DataSource` — exported as `cryptoPrices` (not `crypto`) to
  avoid shadowing the global `globalThis.crypto` (WebCrypto). The public source
  id remains `"crypto"` and the registry re-imports it as `crypto` via
  `import { cryptoPrices as crypto } from "./crypto"`, so the `SOURCES` array
  and all external consumers are unaffected.
  Optional `ids` param (comma-separated CoinGecko coin ids, default:
  `bitcoin,ethereum,solana,binancecoin`). `fetch()` calls the CoinGecko
  `/simple/price` endpoint with `vs_currencies=usd` and
  `include_24hr_change=true`. Returns a human-readable `summary` plus structured
  `items` (one entry per coin with `id`, `usd`, `usd24hChangePct`).

## Dependencies
- Upstream: `registry.ts` (registered in `SOURCES`), `routes/sources.ts`
  (generic catalog + invoke surface).
- Downstream: CoinGecko public API (`api.coingecko.com`); no API key required
  (free tier, rate-limited to ~30 req/min).

## Notes
- No API key is needed — `env` is accepted by the `DataSource` interface but
  is unused in this source.
- The `ids` param uses CoinGecko canonical ids (lowercase, hyphenated where
  multi-word), NOT ticker symbols. Examples: `bitcoin` not `BTC`,
  `binancecoin` not `BNB`.
- The `include_24hr_change=true` query param is what adds `usd_24h_change` to
  each coin object; omitting it would return only `usd`.
- Coins not found in the response (unknown ids or temporary upstream gaps) are
  surfaced in the summary as "unavailable" and excluded from `items`; if
  **all** requested coins are missing the source throws rather than returning
  empty data.
- Capped at 25 coin ids per request to avoid oversized prompts.
- Persistence shape: `observations` — two series per coin:
  - `{id}.usd` — USD price
  - `{id}.usd_24h_change` — 24-hour percentage change

## Change history

### 2026-06-15 — review fixes
- **Export rename**: `crypto` → `cryptoPrices` to avoid shadowing `globalThis.crypto`
  (WebCrypto). Public source id `"crypto"` is unchanged. `registry.ts` imports
  via alias so its `SOURCES` array is unaffected.
- **Value validation in `toObservations`**: guard now rejects items with an
  empty `id` string or a non-finite `usd` price
  (`!it || typeof it.id !== "string" || it.id.length === 0 || !Number.isFinite(it.usd)`).
  The 24h-change observation is also guarded with `Number.isFinite` to prevent
  pushing NaN into the observation store.
- **`source` field**: `toObservations` now uses `result.source` instead of the
  hardcoded string `"crypto"`.
- **`fetch` signature**: added the unused `_env` parameter to match the
  `DataSource` interface (`async fetch(params, _env)`).
- **Single timestamp**: `fetch()` now captures `const now = new Date()` once
  and reuses it for both the summary heading and `fetchedAt`, keeping them
  consistent.
- **Zero-change arrow**: the arrow logic changed from `pct >= 0 ? "▲" : "▼"`
  to `pct > 0 ? "▲" : pct < 0 ? "▼" : "◆"`, so a 0% mover shows `◆` and no
  `+` prefix instead of a misleading upward arrow.

### 2026-06-15 — created
- **Motivation**: NanoBee chat had no data tool for cryptocurrency prices,
  causing the agent to respond "I cannot access real-time crypto data" when
  users asked about 比特币 / 以太坊 / 加密货币行情.
- **Goal**: a structured crypto source so the agent gains a `datahub_crypto`
  tool and can report live coin prices and 24-hour moves for any CoinGecko
  coin.
- **Key decision**: CoinGecko's free `/simple/price` endpoint requires no API
  key and covers all major coins — ideal for a public data hub that must stay
  credential-free for this category. Persist as `observations` with hourly
  cadence (crypto trades 24/7, unlike equities) so the agent can answer
  trend and overnight-change questions from the historical store.
