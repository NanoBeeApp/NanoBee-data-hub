/**
 * Gold price data source.
 *
 * Real-time spot gold via Twelve Data (free tier supports XAU/USD):
 *   https://api.twelvedata.com/quote?symbol=XAU/USD,USD/CNY&apikey=...
 *
 * Returns the international spot benchmark (XAU/USD per troy ounce) plus a
 * derived price-per-gram in USD and CNY (converted with the live USD/CNY
 * rate), so a China-based user asking "黄金现价" / "30 克值多少钱" gets a
 * directly usable answer. This is the spot benchmark, NOT a specific
 * jeweler's retail quote.
 *
 * The Twelve Data key is read from `env.TWELVE_DATA_KEY` — a project-level
 * source credential, never exposed as a model-visible param.
 */

import type { DataSource, SourceResult } from "./types";

/** Grams in one troy ounce (the unit XAU is quoted in). */
const TROY_OUNCE_GRAMS = 31.1034768;

interface TdQuote {
	price?: string;
	close?: string;
	percent_change?: string;
	datetime?: string;
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

/** Fixed-decimal formatter with thousands separators. */
function fmt(n: number, decimals = 2): string {
	return n.toLocaleString("en-US", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
}

export const gold: DataSource = {
	id: "gold",
	name: "Gold Price",
	description:
		"Real-time spot gold price. Use for ANY question about the gold price — 黄金现价 / 金价 / 黄金多少钱一克 / gold price / XAU. " +
		"Returns international spot gold (XAU/USD per troy ounce), price per gram in USD, and price per gram in CNY (converted via the live USD/CNY rate). " +
		"Optionally pass 'grams' to also get the total value for that weight. " +
		"Note: this is the international spot benchmark, not a specific jeweler's retail price.",
	params: [
		{
			name: "grams",
			type: "number",
			description:
				"Optional weight in grams. When provided, the total value for that weight (USD and CNY) is included.",
			required: false,
		},
	],

	async fetch(params, env): Promise<SourceResult> {
		const key = (env as { TWELVE_DATA_KEY?: string } | undefined)?.TWELVE_DATA_KEY;
		if (!key) {
			throw new Error("gold source unavailable: TWELVE_DATA_KEY is not configured");
		}

		// One call fetches both the gold quote and the FX rate (saves quota).
		const url = `https://api.twelvedata.com/quote?symbol=XAU/USD,USD/CNY&apikey=${encodeURIComponent(key)}`;
		const res = await fetch(url, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(10_000),
		});
		if (!res.ok) {
			throw new Error(`Twelve Data returned ${res.status}`);
		}
		const data = (await res.json()) as TdMultiResponse;

		const xau = data["XAU/USD"];
		if (!xau || (xau.code && xau.code !== 200)) {
			throw new Error(`gold quote unavailable: ${xau?.message ?? "no XAU/USD data returned"}`);
		}
		const usdPerOz = num(xau.price ?? xau.close);
		if (usdPerOz === null) {
			throw new Error("gold quote missing a usable price");
		}

		// USD/CNY is best-effort: if the FX leg is missing we still report USD.
		const usdCny = num(data["USD/CNY"]?.price ?? data["USD/CNY"]?.close);
		const usdPerGram = usdPerOz / TROY_OUNCE_GRAMS;
		const cnyPerGram = usdCny !== null ? usdPerGram * usdCny : null;
		const grams = typeof params.grams === "number" && params.grams > 0 ? params.grams : null;

		const pct = num(xau.percent_change);
		const lines: string[] = [
			`International spot gold (XAU/USD): $${fmt(usdPerOz)} / troy ounce` +
				(pct !== null ? ` (${pct >= 0 ? "+" : ""}${fmt(pct)}% today)` : ""),
			`≈ $${fmt(usdPerGram)} / gram`,
		];
		if (cnyPerGram !== null) {
			lines.push(`≈ ¥${fmt(cnyPerGram)} / gram (live USD/CNY ${fmt(usdCny as number, 4)})`);
		}
		if (grams !== null) {
			lines.push(
				`For ${grams} g: ≈ $${fmt(usdPerGram * grams)}` +
					(cnyPerGram !== null ? ` ≈ ¥${fmt(cnyPerGram * grams)}` : ""),
			);
		}
		lines.push("Source: Twelve Data spot benchmark — not a jeweler retail quote, not investment advice.");

		return {
			source: gold.id,
			fetchedAt: new Date().toISOString(),
			summary: lines.join("\n"),
			items: [
				{
					xauUsdPerOz: usdPerOz,
					usdPerGram,
					usdCny,
					cnyPerGram,
					grams,
					totalUsd: grams !== null ? usdPerGram * grams : null,
					totalCny: grams !== null && cnyPerGram !== null ? cnyPerGram * grams : null,
					percentChange: pct,
					datetime: xau.datetime ?? null,
				},
			],
		};
	},
};
