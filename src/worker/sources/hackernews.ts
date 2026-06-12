/**
 * Hacker News data source.
 *
 * Backed by the public Algolia HN Search API (no key required):
 *   https://hn.algolia.com/api/v1/search?tags=front_page
 *   https://hn.algolia.com/api/v1/search?tags=story&query=...
 *
 * "front_page" returns the stories currently on the HN front page, which is
 * the natural answer to "what developer news is on HN today". An optional
 * `query` narrows it to a keyword via full-text search instead.
 */

import type { DataSource, SourceResult } from "./types";

const ALGOLIA_BASE = "https://hn.algolia.com/api/v1";

interface AlgoliaHit {
	objectID: string;
	title: string | null;
	url: string | null;
	author: string | null;
	points: number | null;
	num_comments: number | null;
	created_at: string | null;
}

interface AlgoliaResponse {
	hits: AlgoliaHit[];
}

export const hackerNews: DataSource = {
	id: "hackernews",
	name: "Hacker News",
	description:
		"Top technology / developer / startup news from Hacker News. Use for questions about today's tech news, developer news, programming/startup headlines, what's trending on HN. Returns story titles, links, points and comment counts.",
	params: [
		{
			name: "query",
			type: "string",
			description:
				"Optional keyword to search stories by (e.g. 'rust', 'ai'). Omit to get the current front page.",
			required: false,
		},
		{
			name: "limit",
			type: "number",
			description: "How many stories to return (1-30).",
			required: false,
			default: 10,
		},
	],

	async fetch(params): Promise<SourceResult> {
		const query = typeof params.query === "string" ? params.query.trim() : "";
		const rawLimit = typeof params.limit === "number" ? params.limit : 10;
		const limit = Math.min(Math.max(Math.trunc(rawLimit) || 10, 1), 30);

		// Front page when no keyword; otherwise a story-tagged full-text search.
		const url = query
			? `${ALGOLIA_BASE}/search?tags=story&query=${encodeURIComponent(query)}&hitsPerPage=${limit}`
			: `${ALGOLIA_BASE}/search?tags=front_page&hitsPerPage=${limit}`;

		const res = await fetch(url, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(10_000),
		});
		if (!res.ok) {
			throw new Error(`Hacker News API returned ${res.status}`);
		}

		const data = (await res.json()) as AlgoliaResponse;
		const hits = (data.hits ?? []).filter((h) => h.title).slice(0, limit);

		const items = hits.map((h) => ({
			id: h.objectID,
			title: h.title,
			url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
			author: h.author,
			points: h.points ?? 0,
			comments: h.num_comments ?? 0,
			createdAt: h.created_at,
		}));

		const heading = query
			? `Hacker News stories matching "${query}" (${items.length}):`
			: `Hacker News front page (${items.length} stories):`;
		const lines = items.map(
			(it, i) =>
				`${i + 1}. ${it.title} — ${it.points} points, ${it.comments} comments\n   ${it.url}`,
		);
		const summary = [heading, ...lines].join("\n");

		return {
			source: hackerNews.id,
			fetchedAt: new Date().toISOString(),
			summary,
			items,
		};
	},
};
