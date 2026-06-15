/**
 * Cryptocurrency price data source.
 *
 * Real-time spot prices via CoinGecko's free public API (no key required,
 * rate-limited to ~30 req/min):
 *   https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=usd&include_24hr_change=true
 *
 * Returns the USD price and 24-hour percentage change for each requested coin.
 * Supports any CoinGecko canonical coin id; the default watchlist is the four
 * highest-liquidity coins: bitcoin, ethereum, solana, binancecoin.
 *
 * No API key needed — `env` is accepted by the interface but unused here.
 */

import type { ObservationInput } from "../storage/types";
import type { DataSource, SourceResult } from "./types";

/** Default watchlist for scheduled refresh and unparameterized requests. */
const DEFAULT_IDS = "bitcoin,ethereum,solana,binancecoin";

/**
 * Human-readable display names for the default coins. Unknown ids fall back to
 * their raw CoinGecko id (already readable, e.g. "solana").
 */
const DISPLAY_NAMES: Record<string, string> = {
	bitcoin: "Bitcoin (BTC)",
	ethereum: "Ethereum (ETH)",
	solana: "Solana (SOL)",
	binancecoin: "BNB",
};

/** Shape of each entry in a crypto `SourceResult.items`. */
interface CryptoItem {
	id: string;
	usd: number;
	usd24hChangePct: number | null;
}

/**
 * CoinGecko /simple/price response: top-level keys are coin ids; each value
 * has `usd` and (when include_24hr_change=true) `usd_24h_change`.
 */
type CgPriceResponse = Record<
	string,
	{ usd?: number; usd_24h_change?: number }
>;

/** Fixed-decimal formatter with thousands separators. */
function fmt(n: number, decimals = 2): string {
	return n.toLocaleString("en-US", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
}

// Exported as `cryptoPrices` to avoid shadowing the global `globalThis.crypto`
// (WebCrypto). The public source id `"crypto"` is unchanged.
export const cryptoPrices: DataSource = {
	id: "crypto",
	name: "Crypto Prices",
	description:
		"Real-time cryptocurrency spot prices with 24-hour change. Use for ANY question about crypto / coin prices — " +
		"比特币 / 以太坊 / 加密货币 / 币价 / 加密资产 / 虚拟货币 / BTC / ETH / SOL / BNB / bitcoin price / ethereum price. " +
		"Pass a comma-separated list of CoinGecko coin ids in `ids` (e.g. 'bitcoin', 'bitcoin,ethereum,solana'). " +
		"Returns the current USD price and 24-hour percentage change for each coin. " +
		"Source: CoinGecko public API — not investment advice.",
	params: [
		{
			name: "ids",
			type: "string",
			required: false,
			description:
				"Comma-separated CoinGecko coin ids, e.g. 'bitcoin' or 'bitcoin,ethereum,solana,binancecoin'. " +
				"Defaults to bitcoin, ethereum, solana, and binancecoin when omitted.",
			default: DEFAULT_IDS,
		},
	],

	// Crypto trades 24/7 — persist every price tick as a numeric time-series
	// so the agent can query trends, overnight moves, and week-over-week changes.
	persist: {
		shape: "observations",
		retention: { rawTtlDays: 90 },
		toObservations(result: SourceResult): ObservationInput[] {
			const ts = result.fetchedAt;
			const obs: ObservationInput[] = [];
			for (const it of result.items as CryptoItem[]) {
				// Reject items with an empty id or a non-finite price.
				if (!it || typeof it.id !== "string" || it.id.length === 0 || !Number.isFinite(it.usd)) continue;
				// USD price series.
				obs.push({
					source: result.source,
					seriesKey: `${it.id}.usd`,
					ts,
					value: it.usd,
					dims: { coin: it.id, currency: "usd", metric: "price" },
				});
				// 24h change series — only when the field is present and finite.
				if (typeof it.usd24hChangePct === "number" && Number.isFinite(it.usd24hChangePct)) {
					obs.push({
						source: result.source,
						seriesKey: `${it.id}.usd_24h_change`,
						ts,
						value: it.usd24hChangePct,
						dims: { coin: it.id, currency: "usd", metric: "24h_change_pct" },
					});
				}
			}
			return obs;
		},
	},

	// Crypto never sleeps — refresh hourly around the clock.
	schedule: {
		cadence: "hourly",
		refreshParams: () => [{ ids: DEFAULT_IDS }],
	},

	async fetch(params, _env): Promise<SourceResult> {
		// Resolve ids: caller-supplied string, or the default watchlist.
		const rawIds =
			typeof params.ids === "string" && params.ids.trim().length > 0
				? params.ids.trim()
				: DEFAULT_IDS;

		// Sanitize: lowercase, strip spaces around commas, dedupe, cap at 25 coins.
		const ids = [
			...new Set(
				rawIds
					.split(",")
					.map((s) => s.trim().toLowerCase())
					.filter(Boolean),
			),
		].slice(0, 25);

		if (ids.length === 0) {
			throw new Error(
				"no valid coin ids provided (expected CoinGecko ids such as 'bitcoin', 'ethereum')",
			);
		}

		const url =
			`https://api.coingecko.com/api/v3/simple/price` +
			`?ids=${encodeURIComponent(ids.join(","))}` +
			`&vs_currencies=usd` +
			`&include_24hr_change=true`;

		const res = await fetch(url, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(10_000),
		});
		if (!res.ok) {
			throw new Error(`CoinGecko returned ${res.status}`);
		}

		const data = (await res.json()) as CgPriceResponse;

		if (typeof data !== "object" || data === null || Array.isArray(data)) {
			throw new Error("unexpected CoinGecko response shape");
		}

		const items: CryptoItem[] = [];
		const lines: string[] = [];

		for (const id of ids) {
			const coin = data[id];
			if (!coin || typeof coin.usd !== "number" || !Number.isFinite(coin.usd)) {
				lines.push(`${DISPLAY_NAMES[id] ?? id}: unavailable`);
				continue;
			}

			const pct =
				typeof coin.usd_24h_change === "number" && Number.isFinite(coin.usd_24h_change)
					? coin.usd_24h_change
					: null;

			// Show ▲ for positive, ▼ for negative, ◆ for exactly zero.
			const arrow = pct !== null ? (pct > 0 ? "▲" : pct < 0 ? "▼" : "◆") : "";
			const pctStr = pct !== null ? ` ${arrow} ${pct > 0 ? "+" : ""}${fmt(pct)}%` : "";

			lines.push(`${DISPLAY_NAMES[id] ?? id}: $${fmt(coin.usd)}${pctStr} (24h)`);

			items.push({ id, usd: coin.usd, usd24hChangePct: pct });
		}

		if (items.length === 0) {
			throw new Error(
				`CoinGecko returned no usable prices for: ${ids.join(", ")} — check the coin ids`,
			);
		}

		// Capture a single timestamp so the heading and fetchedAt are consistent.
		const now = new Date();
		const heading = `Crypto prices (USD) — source: CoinGecko, ${now.toUTCString()}`;

		return {
			source: cryptoPrices.id,
			fetchedAt: now.toISOString(),
			summary: [heading, ...lines, "Not investment advice."].join("\n"),
			items,
		};
	},
};
