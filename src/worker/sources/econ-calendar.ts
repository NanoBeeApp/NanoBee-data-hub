/**
 * Economic calendar data source.
 *
 * This week's macro economic events from Forex Factory's free weekly JSON
 * (no key required):
 *   https://nfs.faireconomy.media/ff_calendar_thisweek.json
 *
 * The upstream rate-limits to ~2 requests / 5 min, so callers must not poll it
 * tightly. Each event carries a currency code (Forex Factory's `country`
 * field is actually the currency, e.g. USD/EUR/CNY), an impact level and the
 * forecast / previous values. Optional filters narrow by currency and impact.
 */

import type { DataSource, SourceResult } from "./types";

interface FfEvent {
	title?: string;
	/** Forex Factory puts the currency code here (USD/EUR/JPY/CNY/...). */
	country?: string;
	date?: string;
	impact?: string;
	forecast?: string;
	previous?: string;
}

/** Sort key so High-impact events surface first. */
function impactRank(impact: string | undefined): number {
	return { high: 0, medium: 1, low: 2 }[(impact ?? "").toLowerCase()] ?? 3;
}

/** Render an ISO/offset timestamp as compact UTC, tolerating bad input. */
function toUtc(date: string | undefined): string {
	if (!date) return "?";
	try {
		return `${new Date(date).toISOString().replace("T", " ").slice(0, 16)} UTC`;
	} catch {
		return date;
	}
}

export const econCalendar: DataSource = {
	id: "econ_calendar",
	name: "Economic Calendar",
	description:
		"This week's economic calendar / macro data events (non-farm payrolls, CPI, interest-rate decisions, GDP, PMI, etc.). " +
		"Use for questions about 经济数据 / 财经日历 / 本周重要数据 / 非农 / CPI / 美联储 / economic events this week. " +
		"Optional `currency` filters by currency code (e.g. 'USD', 'CNY', 'EUR'); optional `impact` filters by importance ('High','Medium','Low'). " +
		"Returns each event's time (UTC), currency, impact, forecast and previous value.",
	params: [
		{
			name: "currency",
			type: "string",
			required: false,
			description: "Filter by currency code, e.g. 'USD'. Omit for all currencies.",
		},
		{
			name: "impact",
			type: "string",
			required: false,
			enum: ["High", "Medium", "Low"],
			description: "Filter by impact level. Omit for all levels.",
		},
	],

	async fetch(params): Promise<SourceResult> {
		const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(10_000),
		});
		if (!res.ok) {
			throw new Error(`Forex Factory returned ${res.status}`);
		}
		const events = (await res.json()) as FfEvent[];
		if (!Array.isArray(events)) {
			throw new Error("unexpected economic-calendar payload");
		}

		const cur = typeof params.currency === "string" ? params.currency.trim().toUpperCase() : "";
		const imp = typeof params.impact === "string" ? params.impact.trim().toLowerCase() : "";
		let filtered = events;
		if (cur) filtered = filtered.filter((e) => (e.country ?? "").toUpperCase() === cur);
		if (imp) filtered = filtered.filter((e) => (e.impact ?? "").toLowerCase() === imp);

		// Cap the digest (High-impact first) so the prompt stays small.
		const top = [...filtered]
			.sort((a, b) => impactRank(a.impact) - impactRank(b.impact))
			.slice(0, 30);

		const heading =
			`Economic calendar this week${cur ? ` · ${cur}` : ""}${imp ? ` · ${imp} impact` : ""} ` +
			`(${filtered.length} event${filtered.length === 1 ? "" : "s"}` +
			`${filtered.length > top.length ? `, top ${top.length} shown` : ""}):`;
		const lines = top.map(
			(e) =>
				`${toUtc(e.date)} · ${e.country ?? "?"} · [${e.impact ?? "?"}] ${e.title ?? "?"}` +
				(e.forecast || e.previous
					? ` (forecast ${e.forecast || "—"}, prev ${e.previous || "—"})`
					: ""),
		);

		return {
			source: econCalendar.id,
			fetchedAt: new Date().toISOString(),
			summary: [heading, ...lines].join("\n"),
			items: top,
		};
	},
};
