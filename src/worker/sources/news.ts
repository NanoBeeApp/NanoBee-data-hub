/**
 * Market news data source.
 *
 * Latest financial / market news via Finnhub's free general-news endpoint:
 *   https://finnhub.io/api/v1/news?category=general
 *   (key passed via the `X-Finnhub-Token` request header, not the URL)
 *
 * Returns the top ~40 items from Finnhub's general market-news feed, giving
 * the agent live headlines so questions like "最新财经新闻" / "market news" /
 * "金融新闻" can be answered with real content instead of the model
 * apologising that it "cannot access the internet".
 *
 * The Finnhub key is read from `env.FINNHUB_KEY` — a project-level source
 * credential, never exposed as a model-visible param.
 *
 * Category values accepted by Finnhub: general, forex, crypto, merger.
 */

import type { RecordInput } from "../storage/types";
import type { DataSource, SourceResult } from "./types";

/** Max items to keep after the upstream fetch (caps prompt + storage size). */
const MAX_ITEMS = 40;

/** Shape of one item in the Finnhub /news response. */
interface FinnhubNewsItem {
	category?: string;
	datetime?: number;
	headline?: string;
	id?: number;
	image?: string;
	related?: string;
	source?: string;
	summary?: string;
	url?: string;
}

/**
 * Render a Unix-seconds timestamp as a compact UTC string, tolerating bad
 * input (Finnhub occasionally sends 0 or a negative value).
 */
function toUtc(unixSeconds: number | undefined): string {
	if (!unixSeconds || unixSeconds <= 0) return "?";
	try {
		return new Date(unixSeconds * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC";
	} catch {
		return "?";
	}
}

/**
 * Convert a Unix-seconds timestamp to ISO 8601, or undefined when invalid.
 * Used for the storage `ts` field — undefined lets the store fall back to
 * ingest time rather than storing a nonsense date.
 */
function toIso(unixSeconds: number | undefined): string | undefined {
	if (!unixSeconds || unixSeconds <= 0) return undefined;
	try {
		return new Date(unixSeconds * 1000).toISOString();
	} catch {
		return undefined;
	}
}

export const news: DataSource = {
	id: "news",
	name: "Market News",
	description:
		"Latest financial and market news headlines. Use for ANY question about recent news — " +
		"财经新闻 / 市场新闻 / 科技新闻 / 金融新闻 / latest news / market news / financial news. " +
		"Optional `category` filters the feed: 'general' (default), 'forex', 'crypto', or 'merger'. " +
		"Returns up to 40 recent headlines with publication time, source, and a short summary.",
	params: [
		{
			name: "category",
			type: "string",
			required: false,
			enum: ["general", "forex", "crypto", "merger"],
			default: "general",
			description:
				"News category. 'general' covers broad market / financial news (default). " +
				"'forex' = FX markets, 'crypto' = cryptocurrency, 'merger' = M&A news.",
		},
	],

	// Persist each article as a searchable record so the agent can do
	// full-text lookups across recent headlines without re-fetching the feed.
	persist: {
		shape: "records",
		retention: { rawTtlDays: 14 },
		toRecords(result: SourceResult): RecordInput[] {
			return (result.items as FinnhubNewsItem[])
				.filter((item) => item && item.headline)
				.map((item) => {
					// Resolve the category that was stamped onto each item in fetch().
					const cat = item.category ?? "general";
					// Namespace by category to prevent id collisions across categories
					// (e.g. forex and general may share the same Finnhub numeric id).
					const rawKey =
						typeof item.id === "number" && item.id > 0
							? String(item.id)
							: (item.url ?? `${item.datetime ?? 0}|${item.headline ?? ""}`);
					const itemKey = `${cat}|${rawKey}`;

					const tags: string[] = [
						...(item.source ? [item.source] : []),
						...(item.category ? [item.category] : []),
					];

					return {
						source: "news",
						itemKey,
						ts: toIso(item.datetime),
						title: item.headline,
						summary: item.summary,
						body: `${item.headline ?? ""} ${item.summary ?? ""}`.trim(),
						url: item.url,
						lang: "en",
						tags,
						payload: item,
					};
				});
		},
	},

	// News changes continuously — refresh every hour so the cached snapshot
	// stays reasonably fresh without hammering the free-tier quota.
	schedule: {
		cadence: "hourly",
		// Single fetch with default params (general category) is the canonical snapshot.
		refreshParams: () => [{}],
	},

	async fetch(params, env): Promise<SourceResult> {
		const key = (env as { FINNHUB_KEY?: string } | undefined)?.FINNHUB_KEY;
		if (!key) {
			throw new Error("news source unavailable: FINNHUB_KEY is not configured");
		}

		// Resolve category, falling back to 'general' for anything unrecognised.
		const VALID_CATEGORIES = new Set(["general", "forex", "crypto", "merger"]);
		const rawCat = typeof params.category === "string" ? params.category.trim().toLowerCase() : "";
		const category = VALID_CATEGORIES.has(rawCat) ? rawCat : "general";

		const url =
			`https://finnhub.io/api/v1/news` +
			`?category=${encodeURIComponent(category)}`;

		const res = await fetch(url, {
			headers: {
				Accept: "application/json",
				"X-Finnhub-Token": key,
			},
			signal: AbortSignal.timeout(10_000),
		});
		if (!res.ok) {
			throw new Error(`Finnhub returned ${res.status}`);
		}

		const raw = (await res.json()) as unknown;

		// Finnhub occasionally returns HTTP 200 with a JSON error object, e.g.
		// {"error":"API limit reached."}. Surface the real message early.
		if (raw !== null && typeof raw === "object" && !Array.isArray(raw) && "error" in raw) {
			throw new Error(`Finnhub error: ${(raw as { error: unknown }).error}`);
		}

		// Finnhub returns an array; guard against unexpected shapes.
		if (!Array.isArray(raw)) {
			throw new Error("unexpected news payload: expected an array");
		}

		const allItems = raw as FinnhubNewsItem[];
		if (allItems.length === 0) {
			throw new Error("Finnhub returned an empty news feed — cannot provide headlines");
		}

		// Cap to the most recent MAX_ITEMS entries (Finnhub orders newest-first).
		// Tag each item with the resolved category so toRecords can namespace
		// the itemKey and avoid cross-category id collisions in storage.
		const items = allItems.slice(0, MAX_ITEMS).map((item) => ({
			...item,
			category: item.category ?? category,
		}));

		const heading = `Market news (${category}, ${items.length} articles${allItems.length > items.length ? ` of ${allItems.length} returned` : ""}):`;
		const lines = items.map((item) => {
			const when = toUtc(item.datetime);
			const src = item.source ?? "?";
			const headline = item.headline ?? "(no headline)";
			const blurb = item.summary ? ` — ${item.summary.slice(0, 120)}${item.summary.length > 120 ? "…" : ""}` : "";
			return `${when} · ${src} · ${headline}${blurb}`;
		});

		return {
			source: news.id,
			fetchedAt: new Date().toISOString(),
			summary: [heading, ...lines].join("\n"),
			items,
		};
	},
};
