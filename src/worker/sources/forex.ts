/**
 * Foreign exchange (FX) rate data source.
 *
 * Real-time currency pair quotes via Twelve Data (free tier supports FX pairs):
 *   https://api.twelvedata.com/quote?symbol=EUR/USD,USD/JPY,USD/CNH,GBP/USD&apikey=...
 *
 * Default pairs: EUR/USD, USD/JPY, USD/CNH, GBP/USD.
 * An optional `pairs` param overrides the list (comma-separated symbol strings).
 *
 * Returns the close price, daily change and percent change for each pair so a
 * user asking "美元汇率" / "欧元兑美元" / "人民币汇率" / "外汇" gets live data.
 * Note: FX has no exchange volume; the `fifty_two_week` nested fields are
 * available from Twelve Data but are not persisted as hourly observations
 * (too static for hourly ingestion).
 *
 * The Twelve Data key is read from `env.TWELVE_DATA_KEY` — a project-level
 * source credential, never exposed as a model-visible param.
 */

import type { ObservationInput } from "../storage/types";
import type { DataSource, SourceResult } from "./types";

/** Default FX pairs fetched on every scheduled tick and unparameterized requests. */
const DEFAULT_PAIRS = "EUR/USD,USD/JPY,USD/CNH,GBP/USD";

/** Shape of each entry in a forex `SourceResult.items` (see fetch() below). */
interface ForexItem {
	symbol: string;
	rate: number | null;
	change: number | null;
	percentChange: number | null;
	isMarketOpen: boolean | null;
	datetime: string | null;
}

interface TdQuote {
	symbol?: string;
	name?: string;
	exchange?: string;
	datetime?: string;
	timestamp?: number;
	open?: string;
	high?: string;
	low?: string;
	close?: string;
	previous_close?: string;
	change?: string;
	percent_change?: string;
	is_market_open?: boolean;
	code?: number;
	message?: string;
}
type TdMultiResponse = Record<string, TdQuote>;

/** Parse a Twelve Data numeric string, or null when absent/invalid. */
function num(v: string | undefined): number | null {
	if (v === undefined) return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

/** Fixed-decimal formatter. */
function fmt(n: number, decimals = 4): string {
	return n.toLocaleString("en-US", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
}

export const forex: DataSource = {
	id: "forex",
	name: "Foreign Exchange",
	description:
		"Real-time foreign exchange (FX) currency pair rates. Use for ANY question about exchange rates or currency prices — " +
		"外汇 / 汇率 / 美元汇率 / 人民币汇率 / 欧元兑美元 / 英镑汇率 / 日元汇率 / USD/CNH / EUR/USD / GBP/USD / forex / FX / currency rate. " +
		"Default pairs are EUR/USD, USD/JPY, USD/CNH (offshore yuan), GBP/USD. " +
		"Pass a comma-separated list of symbol pairs in `pairs` to request different or additional pairs (e.g. 'EUR/USD,AUD/USD'). " +
		"Returns the current rate (close price), daily change, and percent change for each pair. " +
		"Note: FX markets have no exchange volume; rates are from Twelve Data's spot feed.",
	params: [
		{
			name: "pairs",
			type: "string",
			required: false,
			default: DEFAULT_PAIRS,
			description:
				"Comma-separated FX pair symbols, e.g. 'EUR/USD' or 'EUR/USD,USD/JPY,GBP/USD'. " +
				"Defaults to EUR/USD,USD/JPY,USD/CNH,GBP/USD when omitted.",
		},
	],

	// Persist each pair's rate as a numeric time-series (observations) so trend
	// and historical comparison are possible. rawTtlDays = 90 keeps ~3 months of
	// hourly snapshots without excessive growth.
	persist: {
		shape: "observations",
		retention: { rawTtlDays: 90 },
		// The cached snapshot covers the default four-pair set; skip writing a new
		// snapshot when the caller passed a custom pair list.
		snapshotEligible(raw) {
			const p = raw["pairs"];
			return !p || p === DEFAULT_PAIRS;
		},
		toObservations(result: SourceResult): ObservationInput[] {
			const ts = result.fetchedAt;
			const obs: ObservationInput[] = [];
			for (const it of result.items as ForexItem[]) {
				if (!it || typeof it.symbol !== "string") continue;
				if (typeof it.rate === "number") {
					obs.push({
						source: "forex",
						seriesKey: `${it.symbol}.rate`,
						ts,
						value: it.rate,
						dims: {
							percent_change: it.percentChange,
							change: it.change,
							is_market_open: it.isMarketOpen,
							datetime: it.datetime,
						},
					});
				}
			}
			return obs;
		},
	},

	// FX trades nearly around the clock on weekdays — hourly refresh captures
	// the full session including the Asian and London opens.
	schedule: {
		cadence: "hourly",
		refreshParams: () => [{ pairs: DEFAULT_PAIRS }],
	},

	async fetch(params, env): Promise<SourceResult> {
		const key = (env as { TWELVE_DATA_KEY?: string } | undefined)?.TWELVE_DATA_KEY;
		if (!key) {
			throw new Error("forex source unavailable: TWELVE_DATA_KEY is not configured");
		}

		// Resolve which pairs to fetch: caller-supplied or the default watchlist.
		const rawPairs =
			typeof params.pairs === "string" && params.pairs.trim()
				? params.pairs
				: DEFAULT_PAIRS;
		const pairs = rawPairs
			.split(",")
			.map((s) => s.trim().toUpperCase())
			.filter(Boolean)
			// cap to protect the shared free-tier quota (8 credits/min; each symbol = 1 credit, shared with gold + stocks)
			.slice(0, 8);
		if (pairs.length === 0) {
			throw new Error("no valid FX pair symbols provided");
		}

		const url =
			`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(pairs.join(","))}&apikey=${encodeURIComponent(key)}`;
		const res = await fetch(url, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(10_000),
		});
		if (!res.ok) {
			throw new Error(`Twelve Data returned ${res.status}`);
		}

		const data = (await res.json()) as TdQuote | TdMultiResponse;

		// Twelve Data can return HTTP 200 with a top-level error object {code, message}
		// (e.g. bad API key, rate-limit exceeded). Detect and throw before iterating pairs.
		{
			const maybeErr = data as { code?: unknown; message?: unknown };
			if (typeof maybeErr.code === "number" && maybeErr.code !== 200) {
				throw new Error(
					`Twelve Data error ${maybeErr.code}: ${typeof maybeErr.message === "string" ? maybeErr.message : "unknown"}`
				);
			}
		}

		// A single symbol returns a flat quote object; multiple symbols return a
		// map keyed by the symbol string (e.g. "EUR/USD"). Normalise to a map.
		const quoteMap: TdMultiResponse =
			pairs.length === 1
				? { [pairs[0]]: data as TdQuote }
				: (data as TdMultiResponse);

		const items: ForexItem[] = [];
		const lines: string[] = [];

		for (const symbol of pairs) {
			const q = quoteMap[symbol];
			if (!q || (q.code !== undefined && q.code !== 200)) {
				lines.push(`${symbol}: unavailable (${q?.message ?? "no data returned"})`);
				continue;
			}

			const rate = num(q.close);
			if (rate === null) {
				lines.push(`${symbol}: no rate`);
				continue;
			}

			const pct = num(q.percent_change);
			const chg = num(q.change);
			const arrow = pct !== null ? (pct >= 0 ? "▲" : "▼") : "";

			const head =
				`${symbol}: ${fmt(rate)}` +
				(pct !== null ? ` ${arrow} ${pct >= 0 ? "+" : ""}${fmt(pct, 2)}%` : "") +
				(chg !== null ? ` (${chg >= 0 ? "+" : ""}${fmt(chg)})` : "") +
				(q.is_market_open === false ? " [market closed]" : "");

			lines.push(head);
			items.push({
				symbol,
				rate,
				change: chg,
				percentChange: pct,
				isMarketOpen: q.is_market_open ?? null,
				datetime: q.datetime ?? null,
			});
		}

		if (items.length === 0) {
			throw new Error(`no FX rates returned for: ${pairs.join(", ")}`);
		}

		const summary =
			`FX rates (Twelve Data spot):\n` +
			lines.join("\n") +
			"\nNot financial advice.";

		return {
			source: forex.id,
			fetchedAt: new Date().toISOString(),
			summary,
			items,
		};
	},
};
