/**
 * Web search data source — provider-agnostic.
 *
 * The model sees a single "web search" tool (query / max_results / topic). The
 * actual backend is chosen by *which* credential the caller injects: Tavily,
 * Brave Search, Serper (Google) or Exa. The hub holds no credential of its own
 * (public repo, per-user keys), so every provider key is declared
 * `secret: true` — redacted from logs and injected server-side by the caller,
 * never exposed to an LLM.
 *
 * Each provider's response is normalized to the same `{ answer?, items }`
 * shape so consumers get one stable result format regardless of backend.
 */

import type { DataSource, SourceResult } from "./types";

/** Normalized result item shared across every provider. */
interface SearchItem {
	title: string;
	url: string;
	snippet: string;
	score: number;
}

interface ProviderOutput {
	answer?: string;
	items: SearchItem[];
}

/** Per-provider key param name (also the catalog id on the consumer side). */
const PROVIDER_KEYS = {
	tavily: "tavily_api_key",
	brave: "brave_api_key",
	serper: "serper_api_key",
	exa: "exa_api_key",
} as const;

type ProviderId = keyof typeof PROVIDER_KEYS;
/** Try providers in this order; the first one with a key present wins. */
const PROVIDER_ORDER: ProviderId[] = ["tavily", "brave", "serper", "exa"];

const REQUEST_TIMEOUT_MS = 15_000;

/** Strip HTML tags (Brave/Serper snippets can contain <strong> etc.). */
function stripTags(s: string): string {
	return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function clampMax(raw: unknown): number {
	const n = typeof raw === "number" ? raw : 5;
	return Math.min(Math.max(Math.trunc(n) || 5, 1), 10);
}

function providerError(name: string, status: number, body: string): Error {
	return new Error(`${name} API returned ${status}: ${body.slice(0, 300)}`);
}

// --- Provider implementations ---------------------------------------------

async function searchTavily(
	query: string,
	maxResults: number,
	topic: "general" | "news",
	apiKey: string,
): Promise<ProviderOutput> {
	const res = await fetch("https://api.tavily.com/search", {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
		body: JSON.stringify({ query, max_results: maxResults, topic, include_answer: true }),
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	if (!res.ok) throw providerError("Tavily", res.status, await res.text());
	const data = (await res.json()) as {
		answer?: string;
		results?: { title?: string; url?: string; content?: string; score?: number }[];
	};
	const items = (data.results ?? [])
		.filter((r) => r.title && r.url)
		.map((r) => ({
			title: r.title as string,
			url: r.url as string,
			snippet: stripTags(r.content ?? ""),
			score: r.score ?? 0,
		}));
	return { answer: data.answer, items };
}

async function searchBrave(
	query: string,
	maxResults: number,
	topic: "general" | "news",
	apiKey: string,
): Promise<ProviderOutput> {
	const path = topic === "news" ? "news/search" : "web/search";
	const url = `https://api.search.brave.com/res/v1/${path}?q=${encodeURIComponent(
		query,
	)}&count=${maxResults}`;
	const res = await fetch(url, {
		headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	if (!res.ok) throw providerError("Brave", res.status, await res.text());
	const data = (await res.json()) as {
		web?: { results?: { title?: string; url?: string; description?: string }[] };
		results?: { title?: string; url?: string; description?: string }[];
	};
	const raw = topic === "news" ? data.results ?? [] : data.web?.results ?? [];
	const items = raw
		.filter((r) => r.title && r.url)
		.map((r) => ({
			title: stripTags(r.title as string),
			url: r.url as string,
			snippet: stripTags(r.description ?? ""),
			score: 0,
		}));
	return { items };
}

async function searchSerper(
	query: string,
	maxResults: number,
	topic: "general" | "news",
	apiKey: string,
): Promise<ProviderOutput> {
	const endpoint = topic === "news" ? "news" : "search";
	const res = await fetch(`https://google.serper.dev/${endpoint}`, {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
		body: JSON.stringify({ q: query, num: maxResults }),
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	if (!res.ok) throw providerError("Serper", res.status, await res.text());
	const data = (await res.json()) as {
		answerBox?: { answer?: string; snippet?: string };
		organic?: { title?: string; link?: string; snippet?: string }[];
		news?: { title?: string; link?: string; snippet?: string }[];
	};
	const raw = topic === "news" ? data.news ?? [] : data.organic ?? [];
	const items = raw
		.filter((r) => r.title && r.link)
		.map((r) => ({
			title: r.title as string,
			url: r.link as string,
			snippet: stripTags(r.snippet ?? ""),
			score: 0,
		}));
	return { answer: data.answerBox?.answer ?? data.answerBox?.snippet, items };
}

async function searchExa(
	query: string,
	maxResults: number,
	topic: "general" | "news",
	apiKey: string,
): Promise<ProviderOutput> {
	const res = await fetch("https://api.exa.ai/search", {
		method: "POST",
		headers: { "Content-Type": "application/json", "x-api-key": apiKey },
		body: JSON.stringify({
			query,
			numResults: maxResults,
			type: "auto",
			contents: { text: { maxCharacters: 300 } },
			...(topic === "news" ? { category: "news" } : {}),
		}),
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	if (!res.ok) throw providerError("Exa", res.status, await res.text());
	const data = (await res.json()) as {
		results?: { title?: string; url?: string; text?: string; score?: number }[];
	};
	const items = (data.results ?? [])
		.filter((r) => r.title && r.url)
		.map((r) => ({
			title: r.title as string,
			url: r.url as string,
			snippet: stripTags(r.text ?? ""),
			score: r.score ?? 0,
		}));
	return { items };
}

const SEARCHERS: Record<
	ProviderId,
	(q: string, n: number, t: "general" | "news", k: string) => Promise<ProviderOutput>
> = {
	tavily: searchTavily,
	brave: searchBrave,
	serper: searchSerper,
	exa: searchExa,
};

export const webSearch: DataSource = {
	id: "websearch",
	name: "Web Search",
	description:
		"Search the live web. Use for current events, facts that may have changed, or anything not covered by other sources. Returns an optional direct answer plus result titles, URLs and content snippets. The backend (Tavily, Brave, Serper or Exa) is chosen server-side from the caller's credentials.",
	params: [
		{
			name: "query",
			type: "string",
			description: "The search query, in any language.",
			required: true,
		},
		{
			name: "max_results",
			type: "number",
			description: "How many results to return (1-10).",
			required: false,
			default: 5,
		},
		{
			name: "topic",
			type: "string",
			description: "Search category: 'general' (default) or 'news' for recent coverage.",
			required: false,
			enum: ["general", "news"],
		},
		// One key per supported provider — all optional; the caller injects
		// exactly one and that decides which backend runs. None is model-visible.
		{
			name: PROVIDER_KEYS.tavily,
			type: "string",
			description: "Tavily API key (injected by the caller, never by the model).",
			required: false,
			secret: true,
		},
		{
			name: PROVIDER_KEYS.brave,
			type: "string",
			description: "Brave Search API key (injected by the caller, never by the model).",
			required: false,
			secret: true,
		},
		{
			name: PROVIDER_KEYS.serper,
			type: "string",
			description: "Serper API key (injected by the caller, never by the model).",
			required: false,
			secret: true,
		},
		{
			name: PROVIDER_KEYS.exa,
			type: "string",
			description: "Exa API key (injected by the caller, never by the model).",
			required: false,
			secret: true,
		},
	],

	async fetch(params): Promise<SourceResult> {
		const query = typeof params.query === "string" ? params.query.trim() : "";
		if (!query) throw new Error("query is required");
		const maxResults = clampMax(params.max_results);
		const topic = params.topic === "news" ? "news" : "general";

		// Pick the provider whose key the caller injected (exactly one expected).
		const provider = PROVIDER_ORDER.find((id) => {
			const v = params[PROVIDER_KEYS[id]];
			return typeof v === "string" && v.trim() !== "";
		});
		if (!provider) {
			throw new Error(
				"no web-search credential supplied (expected one of: tavily_api_key, brave_api_key, serper_api_key, exa_api_key)",
			);
		}
		const apiKey = String(params[PROVIDER_KEYS[provider]]).trim();

		const { answer, items } = await SEARCHERS[provider](query, maxResults, topic, apiKey);

		const lines = items.map(
			(it, i) => `${i + 1}. ${it.title}\n   ${it.url}\n   ${it.snippet.slice(0, 300)}`,
		);
		const summary = [
			`Web search results for "${query}" via ${provider} (${items.length}):`,
			...(answer ? [`Answer: ${answer}`] : []),
			...lines,
		].join("\n");

		return {
			source: webSearch.id,
			fetchedAt: new Date().toISOString(),
			summary,
			items,
		};
	},
};
