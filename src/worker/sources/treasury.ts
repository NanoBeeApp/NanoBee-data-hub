/**
 * US Treasury average interest rates data source.
 *
 * Monthly average interest rates for US Treasury securities via the public
 * FiscalData API (no API key required):
 *   https://api.fiscaldata.treasury.gov/services/api/fiscal_service/
 *     v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=50
 *
 * The endpoint publishes one record per security type per month (end-of-month
 * record_date). Daily polling detects new months promptly. A single page of 50
 * rows reliably captures all 16 securities for the latest month in one request.
 *
 * Chinese trigger keywords: 美债 / 国债 / 美国国债平均利率 / 美国国债利率 /
 * 国债平均票息利率 / 美债平均利率 / 美国财政部平均利率 / 美国财政部.
 *
 * No API key or credentials are required.
 */

import type { ObservationInput } from "../storage/types";
import type { DataSource, SourceResult } from "./types";

// NOTE: the brackets in `page[size]` MUST be percent-encoded (%5B/%5D). The
// runtime fetch (workerd/undici) rejects raw `[`/`]` in a URL with an internal
// error, even though browsers/curl tolerate them.
const ENDPOINT =
	"https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page%5Bsize%5D=50";

/** Shape of one row returned by the FiscalData API. */
interface FdRow {
	record_date?: string;
	security_type_desc?: string;
	security_desc?: string;
	avg_interest_rate_amt?: string;
	src_line_nbr?: string;
	record_fiscal_year?: string;
	record_fiscal_quarter?: string;
	record_calendar_year?: string;
	record_calendar_quarter?: string;
	record_calendar_month?: string;
	record_calendar_day?: string;
}

interface FdResponse {
	data?: FdRow[];
	meta?: {
		count?: number;
		pagination?: { totalCount?: number };
	};
}

/** Shape of each entry in a treasury `SourceResult.items`. */
interface TreasuryItem {
	recordDate: string;
	securityType: string;
	securityDesc: string;
	avgRatePct: number;
	seriesKey: string;
}

/**
 * Convert a security description to a slug suitable for a series key.
 * Lowercases, collapses non-alphanumeric runs to underscores, and strips
 * leading/trailing underscores.
 *
 * Examples:
 *   "Treasury Bills"                                 → "treasury_bills"
 *   "Treasury Inflation-Protected Securities (TIPS)" → "treasury_inflation_protected_securities_tips"
 *   "Total Interest-bearing Debt"                    → "total_interest_bearing_debt"
 */
function toSlug(desc: string): string {
	return desc
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

/** Parse a numeric string; returns null when absent or non-finite. */
function num(v: string | undefined): number | null {
	if (v === undefined || v === null || v === "") return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

export const treasury: DataSource = {
	id: "treasury",
	name: "US Treasury Rates",
	description:
		"Monthly weighted-average COUPON rate on outstanding US Treasury securities, from the public US Treasury FiscalData API. " +
		"IMPORTANT: this is the weighted-average coupon rate on existing outstanding debt — it is NOT the Federal Reserve policy rate (Fed funds rate) and NOT current market yields. " +
		"Use for questions about 美国国债平均利率 / 国债平均票息利率 / 美债平均利率 / 美国财政部平均利率 / 美国国债利率 / 美债 / 国债 / 美国财政部 / " +
		"Treasury Bills / Treasury Notes / Treasury Bonds / TIPS / T-bills / T-bonds. " +
		"Returns the most recent month's average interest rate (%) for each security type: Treasury Bills, Notes, Bonds, TIPS, " +
		"FRN, Federal Financing Bank, Total Marketable, Domestic Series, State & Local Government Series, US Savings Securities, " +
		"Government Account Series, and the Total Interest-bearing Debt aggregate. " +
		"Data is published monthly (end-of-month record_date); no API key required.",
	params: [],

	// Persist each security's monthly average rate as a numeric time-series.
	// rawTtlDays=400 covers >1 year of monthly records with room to spare.
	persist: {
		shape: "observations",
		retention: { rawTtlDays: 400 },
		toObservations(result: SourceResult): ObservationInput[] {
			const obs: ObservationInput[] = [];
			for (const it of result.items as TreasuryItem[]) {
				if (!it || typeof it.avgRatePct !== "number") continue;
				obs.push({
					source: "treasury",
					seriesKey: `avg_rate.${it.seriesKey}`,
					// record_date is YYYY-MM-DD (monthly cadence)
					ts: `${it.recordDate}T00:00:00.000Z`,
					value: it.avgRatePct,
					dims: {
						security_type: it.securityType,
						security_desc: it.securityDesc,
					},
				});
			}
			return obs;
		},
	},

	// Data is published monthly, but we poll daily so a new month is picked up
	// within 24 hours of publication. The first (and only) refreshParams set is
	// the canonical snapshot for the cached read path.
	schedule: {
		cadence: "daily",
		refreshParams: () => [{}],
	},

	async fetch(_params, _env): Promise<SourceResult> {
		const res = await fetch(ENDPOINT, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(15_000),
		});
		if (!res.ok) {
			throw new Error(`FiscalData Treasury API returned ${res.status}`);
		}

		const body = (await res.json()) as FdResponse;
		const rows = body?.data;
		if (!Array.isArray(rows) || rows.length === 0) {
			throw new Error("FiscalData Treasury API returned no rows");
		}

		// Find the most recent record_date in the batch. Only persist rows
		// matching that date to avoid duplicates across overlapping re-runs.
		const dates = rows.map((r) => r.record_date ?? "").filter(Boolean).sort();
		const maxDate = dates[dates.length - 1];
		if (!maxDate) {
			throw new Error("FiscalData Treasury API rows are missing record_date");
		}

		const latest = rows.filter((r) => r.record_date === maxDate);
		if (latest.length === 0) {
			throw new Error(`No rows found for latest record_date ${maxDate}`);
		}

		const items: TreasuryItem[] = [];
		for (const row of latest) {
			const rate = num(row.avg_interest_rate_amt);
			// Skip rows with no usable rate — never invent a number.
			if (rate === null) continue;
			const desc =
				row.security_desc ??
				(row.src_line_nbr ? "unknown_line_" + row.src_line_nbr : "unknown");
			items.push({
				recordDate: row.record_date ?? maxDate,
				securityType: row.security_type_desc ?? "Unknown",
				securityDesc: desc,
				avgRatePct: rate,
				seriesKey: toSlug(desc),
			});
		}

		const dropped = latest.length - items.length;
		if (dropped) {
			console.warn(
				"[treasury] dropped " +
					dropped +
					"/" +
					latest.length +
					" rows for " +
					maxDate +
					": missing/invalid avg_interest_rate_amt",
			);
		}

		if (items.length === 0) {
			throw new Error(
				`All rows for record_date ${maxDate} have missing or non-numeric avg_interest_rate_amt`,
			);
		}

		// Build a compact human-readable summary grouped by security_type.
		const byType = new Map<string, TreasuryItem[]>();
		for (const it of items) {
			const group = byType.get(it.securityType) ?? [];
			group.push(it);
			byType.set(it.securityType, group);
		}

		const heading = `US Treasury Average Interest Rates — ${maxDate} (${items.length} securities):`;
		const lines: string[] = [heading];
		for (const [type, group] of byType) {
			lines.push(`  ${type}:`);
			for (const it of group) {
				lines.push(`    ${it.securityDesc}: ${it.avgRatePct.toFixed(3)}%`);
			}
		}
		lines.push("Source: US Treasury FiscalData API — public data, not investment advice.");

		return {
			source: treasury.id,
			fetchedAt: new Date().toISOString(),
			summary: lines.join("\n"),
			items,
		};
	},
};
