/**
 * US equity market calendar — used to make scheduled refreshes trading-hours
 * aware (refresh often during the session, back off pre/after, skip when
 * closed / weekends / holidays) so we don't burn upstream quota at 3am.
 *
 * Times are evaluated in US Eastern via the Web-standard `Intl` API (no deps,
 * DST-correct in Workers/Node/browser). NYSE full-closure holidays are listed
 * per year — extend `MARKET_HOLIDAYS` each year (half-days are treated as
 * normal sessions, which is fine for a polling cadence).
 */

import type { Cadence } from "../sources/types";

/** NYSE full-closure dates (ET, YYYY-MM-DD). Update yearly. */
const MARKET_HOLIDAYS = new Set<string>([
	// 2026
	"2026-01-01", // New Year's Day
	"2026-01-19", // Martin Luther King Jr. Day
	"2026-02-16", // Washington's Birthday
	"2026-04-03", // Good Friday
	"2026-05-25", // Memorial Day
	"2026-06-19", // Juneteenth
	"2026-07-03", // Independence Day (observed, Jul 4 is Saturday)
	"2026-09-07", // Labor Day
	"2026-11-26", // Thanksgiving
	"2026-12-25", // Christmas
]);

export type MarketSession = "pre" | "regular" | "after" | "closed";

interface EtParts {
	date: string; // YYYY-MM-DD in ET
	weekday: string; // "Mon".."Sun"
	hm: number; // hour + minute/60 in ET
}

function etParts(d: Date): EtParts {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: "America/New_York",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		weekday: "short",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(d);
	const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
	const hour = Number(get("hour")) % 24;
	const minute = Number(get("minute"));
	return {
		date: `${get("year")}-${get("month")}-${get("day")}`,
		weekday: get("weekday"),
		hm: hour + minute / 60,
	};
}

/** True on weekdays that are not NYSE holidays. */
export function isTradingDay(d: Date = new Date()): boolean {
	const { date, weekday } = etParts(d);
	if (weekday === "Sat" || weekday === "Sun") return false;
	return !MARKET_HOLIDAYS.has(date);
}

/** Classify the current US-market session by ET wall-clock time. */
export function marketSession(d: Date = new Date()): MarketSession {
	if (!isTradingDay(d)) return "closed";
	const { hm } = etParts(d);
	if (hm >= 4 && hm < 9.5) return "pre";
	if (hm >= 9.5 && hm < 16) return "regular";
	if (hm >= 16 && hm < 20) return "after";
	return "closed";
}

/**
 * Decide whether a source on the given cadence should refresh on this tick.
 * The cron fires every 5 minutes; this throttles each cadence and applies the
 * market-hours gate for `market` sources.
 *
 * - market: skip when closed; every ~5min in the regular session, ~15min in
 *   pre/after hours.
 * - hourly: at most once per ~55 minutes.
 * - daily:  at most once per ~20 hours.
 */
export function shouldRefresh(cadence: Cadence, lastFetchAtIso: string | undefined, now: Date = new Date()): boolean {
	const last = lastFetchAtIso ? Date.parse(lastFetchAtIso) : 0;
	const ageMin = (now.getTime() - (Number.isFinite(last) ? last : 0)) / 60_000;
	switch (cadence) {
		case "market": {
			const session = marketSession(now);
			if (session === "closed") return false;
			const minGapMin = session === "regular" ? 5 : 15;
			return ageMin >= minGapMin - 0.5; // small tolerance for cron jitter
		}
		case "hourly":
			return ageMin >= 55;
		case "daily":
			return ageMin >= 20 * 60;
		default:
			return false;
	}
}
