/**
 * US stocks / ETF quote data source.
 *
 * Real-time quotes via Twelve Data (free tier supports US stocks & ETFs):
 *   https://api.twelvedata.com/quote?symbol=QQQ,SPY,AAPL&apikey=...
 *
 * Covers US equities and ETFs. Stock-market INDICES (^IXIC, ^GSPC ...) are NOT
 * available on the free tier, so the description steers the model to the
 * tracking ETF instead: Nasdaq→QQQ, S&P 500→SPY, Dow Jones→DIA.
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

export const stocks: DataSource = {
	id: "stocks",
	name: "US Stocks",
	description:
		"Real-time US stock and ETF quotes. Use for ANY question about a US stock / ETF price — 美股 / 股价 / 纳指 / 标普 / 苹果股价 / 特斯拉 / QQQ / Nvidia. " +
		"Pass one or more ticker symbols in `symbols` (comma-separated), e.g. 'AAPL', 'QQQ,SPY', 'NVDA,TSLA'. " +
		"Stock indices are NOT available — use the tracking ETF instead: Nasdaq→QQQ, S&P 500→SPY, Dow Jones→DIA. " +
		"Returns price, daily change %, day range, volume and 52-week range.",
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

		const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols.join(","))}&apikey=${encodeURIComponent(key)}`;
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
			const range =
				q.low && q.high ? `   day $${fmt(num(q.low) as number)}–$${fmt(num(q.high) as number)}` : "";
			const vol = q.volume ? `, vol ${Number(q.volume).toLocaleString("en-US")}` : "";
			lines.push(
				`${sym} (${q.name ?? sym}): $${fmt(price)} ${arrow}` +
					`${pct !== null ? ` ${pct >= 0 ? "+" : ""}${fmt(pct)}%` : ""}` +
					`${chg !== null ? ` (${chg >= 0 ? "+" : ""}${fmt(chg)})` : ""}` +
					`${q.is_market_open === false ? " [market closed]" : ""}` +
					(range || vol ? `\n${range}${vol}` : ""),
			);
			items.push({
				symbol: sym,
				name: q.name ?? null,
				price,
				change: chg,
				percentChange: pct,
				open: num(q.open),
				high: num(q.high),
				low: num(q.low),
				volume: q.volume ? Number(q.volume) : null,
				isMarketOpen: q.is_market_open ?? null,
				currency: q.currency ?? "USD",
				fiftyTwoWeekHigh: num(q.fifty_two_week?.high),
				fiftyTwoWeekLow: num(q.fifty_two_week?.low),
				datetime: q.datetime ?? null,
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
