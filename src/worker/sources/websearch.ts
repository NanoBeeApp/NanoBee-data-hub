/**
 * Web search data source backed by the Tavily Search API.
 *
 *   POST https://api.tavily.com/search
 *   Authorization: Bearer tvly-...
 *
 * The hub holds no Tavily credential (this is a public repository and the
 * service is per-user keyed): callers pass `tavily_api_key`, declared with
 * `secret: true` so the gateway redacts it from logs and consumers know to
 * inject it server-side rather than expose it to an LLM.
 */

import type { DataSource, SourceResult } from "./types";

const TAVILY_URL = "https://api.tavily.com/search";

interface TavilyResult {
	title?: string;
	url?: string;
	content?: string;
	score?: number;
}

interface TavilyResponse {
	answer?: string;
	results?: TavilyResult[];
}

export const webSearch: DataSource = {
	id: "websearch",
	name: "Web Search",
	description:
		"Search the live web (Tavily). Use for current events, facts that may have changed, or anything not covered by other sources. Returns an optional direct answer plus result titles, URLs and content snippets.",
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
		{
			name: "tavily_api_key",
			type: "string",
			description: "Tavily API key (injected by the caller, never by the model).",
			required: true,
			secret: true,
		},
	],

	async fetch(params): Promise<SourceResult> {
		const query = typeof params.query === "string" ? params.query.trim() : "";
		if (!query) throw new Error("query is required");
		const apiKey =
			typeof params.tavily_api_key === "string" ? params.tavily_api_key.trim() : "";
		if (!apiKey) throw new Error("tavily_api_key is required");
		const rawMax = typeof params.max_results === "number" ? params.max_results : 5;
		const maxResults = Math.min(Math.max(Math.trunc(rawMax) || 5, 1), 10);
		const topic = params.topic === "news" ? "news" : "general";

		const res = await fetch(TAVILY_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				query,
				max_results: maxResults,
				topic,
				include_answer: true,
			}),
			signal: AbortSignal.timeout(15_000),
		});
		if (!res.ok) {
			const body = (await res.text()).slice(0, 300);
			throw new Error(`Tavily API returned ${res.status}: ${body}`);
		}

		const data = (await res.json()) as TavilyResponse;
		const results = (data.results ?? []).filter((r) => r.title && r.url);

		const items = results.map((r) => ({
			title: r.title,
			url: r.url,
			snippet: r.content ?? "",
			score: r.score ?? 0,
		}));

		const lines = items.map(
			(it, i) => `${i + 1}. ${it.title}\n   ${it.url}\n   ${it.snippet.slice(0, 300)}`,
		);
		const summary = [
			`Web search results for "${query}" (${items.length}):`,
			...(data.answer ? [`Answer: ${data.answer}`] : []),
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
