/**
 * US stocks / ETF quote data source.
 *
 * Real-time quotes via Twelve Data (free tier supports US stocks & ETFs):
 *   https://api.twelvedata.com/quote?symbol=QQQ,SPY,AAPL&prepost=true&apikey=...
 *
 * Covers US equities and ETFs. Stock-market INDICES (^IXIC, ^GSPC ...) are NOT
 * available on the free tier, so the description steers the model to the
 * tracking ETF instead: Nasdaq→QQQ, S&P 500→SPY, Dow Jones→DIA.
 *
 * Extended hours: the request passes `prepost=true`, which makes Twelve Data
 * include the latest pre-market / after-hours print (`extended_price`,
 * `extended_change`, `extended_percent_change`, `extended_timestamp`) on top of
 * the regular-session quote — available on the free tier. When the regular
 * session is closed we surface that extended quote so the model can report the
 * live pre-market / after-hours price instead of only the last regular close.
 *
 * The Twelve Data key is read from `env.TWELVE_DATA_KEY` (a project-level
 * source credential shared with the gold source), never a model-visible param.
 */

import type { DataSource, SourceResult } from "./types";

interface TdQuote {
	symbol?: string;
	name?: string;
	close?: string;
	change?: string;
	percent_change?: string;
	open?: string;
	high?: string;
	low?: string;
	volume?: string;
	is_market_open?: boolean;
	datetime?: string;
	currency?: string;
	fifty_two_week?: { high?: string; low?: string };
	// Extended-hours print (only present when `prepost=true` and there is one).
	extended_price?: string;
	extended_change?: string;
	extended_percent_change?: string;
	extended_timestamp?: number;
	code?: number;
	message?: string;
}
type TdMultiResponse = Record<string, TdQuote>;

function num(v: string | undefined): number | null {
	if (v === undefined) return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

function fmt(n: number, decimals = 2): string {
	return n.toLocaleString("en-US", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
}

/**
 * Format a unix-seconds instant in US Eastern time (the market's own clock),
 * e.g. "06-12 19:59 ET". Uses the Web-standard `Intl` time-zone support (no
 * dependency, DST-correct in Workers/browser/Node).
 */
function etLabel(unixSeconds: number): { hour: number; text: string } {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: "America/New_York",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(new Date(unixSeconds * 1000));
	const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
	const hour = Number(get("hour")) % 24;
	const minute = Number(get("minute"));
	return { hour: hour + minute / 60, text: `${get("month")}-${get("day")} ${get("hour")}:${get("minute")} ET` };
}

/** Classify an extended-hours instant by US-Eastern wall-clock time. */
function extendedSession(unixSeconds: number): { name: string; text: string } {
	const { hour, text } = etLabel(unixSeconds);
	// US extended hours: pre-market 04:00–09:30, after-hours 16:00–20:00 ET.
	const name = hour >= 4 && hour < 9.5 ? "pre-market" : hour >= 16 ? "after-hours" : "extended-hours";
	return { name, text };
}

export const stocks: DataSource = {
	id: "stocks",
	name: "US Stocks",
	description:
		"Real-time US stock and ETF quotes, including pre-market and after-hours prices. Use for ANY question about a US stock / ETF price — 美股 / 股价 / 盘前 / 盘后 / 夜盘 / 纳指 / 标普 / 苹果股价 / 特斯拉 / QQQ / Nvidia. " +
		"Pass one or more ticker symbols in `symbols` (comma-separated), e.g. 'AAPL', 'QQQ,SPY', 'NVDA,TSLA'. " +
		"Stock indices are NOT available — use the tracking ETF instead: Nasdaq→QQQ, S&P 500→SPY, Dow Jones→DIA. " +
		"Returns price, daily change %, day range, volume and 52-week range; when the regular session is closed it also returns the latest pre-market / after-hours quote.",
	params: [
		{
			name: "symbols",
			type: "string",
			required: true,
			description:
				"Comma-separated US tickers, e.g. 'AAPL' or 'QQQ,SPY,NVDA'. For indices use ETFs: Nasdaq→QQQ, S&P 500→SPY, Dow→DIA.",
		},
	],

	async fetch(params, env): Promise<SourceResult> {
		const key = (env as { TWELVE_DATA_KEY?: string } | undefined)?.TWELVE_DATA_KEY;
		if (!key) {
			throw new Error("stocks source unavailable: TWELVE_DATA_KEY is not configured");
		}
		const raw = typeof params.symbols === "string" ? params.symbols : "";
		const symbols = raw
			.split(",")
			.map((s) => s.trim().toUpperCase())
			.filter(Boolean)
			.slice(0, 8); // cap to protect the free-tier quota
		if (symbols.length === 0) {
			throw new Error("at least one ticker symbol is required (e.g. 'AAPL' or 'QQQ,SPY')");
		}

		const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols.join(","))}&prepost=true&apikey=${encodeURIComponent(key)}`;
		const res = await fetch(url, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(10_000),
		});
		if (!res.ok) {
			throw new Error(`Twelve Data returned ${res.status}`);
		}
		const data = (await res.json()) as TdQuote | TdMultiResponse;
		// A single symbol returns a flat quote; multiple return a map keyed by symbol.
		const quotes: TdQuote[] =
			symbols.length === 1
				? [data as TdQuote]
				: symbols.map((s) => (data as TdMultiResponse)[s]).filter(Boolean);

		const items: unknown[] = [];
		const lines: string[] = [];
		for (const q of quotes) {
			const sym = q?.symbol ?? "?";
			if (!q || (q.code && q.code !== 200)) {
				lines.push(`${sym}: unavailable (${q?.message ?? "no data"})`);
				continue;
			}
			const price = num(q.close);
			if (price === null) {
				lines.push(`${sym}: no price`);
				continue;
			}
			const pct = num(q.percent_change);
			const chg = num(q.change);
			const arrow = pct !== null ? (pct >= 0 ? "▲" : "▼") : "";
			const marketOpen = q.is_market_open !== false;

			// Regular-session line. When the market is closed, `close` is the last
			// regular-session close — label it so the model doesn't pass it off as live.
			let head =
				`${sym} (${q.name ?? sym}): $${fmt(price)} ${arrow}` +
				`${pct !== null ? ` ${pct >= 0 ? "+" : ""}${fmt(pct)}%` : ""}` +
				`${chg !== null ? ` (${chg >= 0 ? "+" : ""}${fmt(chg)})` : ""}` +
				`${marketOpen ? "" : " [regular close]"}`;

			// Extended-hours (pre-market / after-hours) print — only meaningful while
			// the regular session is closed and Twelve Data returned one.
			const extPrice = num(q.extended_price);
			let extSessionName: string | null = null;
			let extAsOf: string | null = null;
			let extPct: number | null = null;
			let extChg: number | null = null;
			if (!marketOpen && extPrice !== null && typeof q.extended_timestamp === "number") {
				const session = extendedSession(q.extended_timestamp);
				extSessionName = session.name;
				extAsOf = session.text;
				extPct = num(q.extended_percent_change);
				extChg = num(q.extended_change);
				const extArrow = extPct !== null ? (extPct >= 0 ? "▲" : "▼") : "";
				head +=
					`\n   ${extSessionName} $${fmt(extPrice)} ${extArrow}` +
					`${extPct !== null ? ` ${extPct >= 0 ? "+" : ""}${fmt(extPct)}%` : ""}` +
					`${extChg !== null ? ` (${extChg >= 0 ? "+" : ""}${fmt(extChg)})` : ""}` +
					` as of ${extAsOf}`;
			}

			const low = num(q.low);
			const high = num(q.high);
			const range = low !== null && high !== null ? `day $${fmt(low)}–$${fmt(high)}` : "";
			const vol = q.volume ? `vol ${Number(q.volume).toLocaleString("en-US")}` : "";
			const meta = [range, vol].filter(Boolean).join(", ");
			lines.push(head + (meta ? `\n   ${meta}` : ""));
			items.push({
				symbol: sym,
				name: q.name ?? null,
				price,
				change: chg,
				percentChange: pct,
				open: num(q.open),
				high,
				low,
				volume: q.volume ? Number(q.volume) : null,
				isMarketOpen: q.is_market_open ?? null,
				currency: q.currency ?? "USD",
				fiftyTwoWeekHigh: num(q.fifty_two_week?.high),
				fiftyTwoWeekLow: num(q.fifty_two_week?.low),
				datetime: q.datetime ?? null,
				// Extended-hours quote (null while the regular session is open).
				extendedPrice: extPrice,
				extendedChange: extChg,
				extendedPercentChange: extPct,
				extendedSession: extSessionName,
				extendedAsOfEt: extAsOf,
				extendedTimestamp: typeof q.extended_timestamp === "number" ? q.extended_timestamp : null,
			});
		}
		if (items.length === 0) {
			throw new Error(`no quotes returned for: ${symbols.join(", ")}`);
		}

		return {
			source: stocks.id,
			fetchedAt: new Date().toISOString(),
			summary: lines.join("\n"),
			items,
		};
	},
};
