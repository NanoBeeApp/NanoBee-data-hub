/**
 * Web page content data source.
 *
 * Fetches any caller-supplied URL and extracts readable text from the HTML —
 * no fixed upstream API, no authentication required. The raw HTML is stored
 * in the blob store (R2) and the extracted text is indexed for FTS (D1), so
 * consumers can search page content without re-fetching.
 *
 * Chinese trigger keywords surfaced in the description:
 *   网页内容 / 抓取网页 / 读取链接 / 网页正文 / 提取网页文字
 *
 * Extraction pipeline (pure string ops — safe in Workers and browser; no DOM):
 *   1. Remove <script>, <style>, <noscript> blocks (with their content).
 *   2. Strip the remaining HTML tags.
 *   3. Decode common HTML entities (named + numeric decimal + numeric hex).
 *   4. Collapse whitespace.
 *   5. Cap at 20 000 characters.
 *
 * Persistence:
 *   shape: "records"
 *   blob : raw HTML → R2 (via storage layer; this module never touches env.BLOBS)
 *   body : extracted text → D1 FTS index
 *   itemKey: the URL itself (natural dedup — same URL re-fetched upserts)
 *   snapshotEligible: always false (a URL param is always a narrowing param;
 *     a cached snapshot for a different URL must never be served).
 *
 * No schedule — on-demand only.
 */

import type { RecordInput } from "../storage/types";
import type { DataSource, SourceResult } from "./types";

// ---------------------------------------------------------------------------
// Module-private store: carries raw HTML + actual content-type from fetch() to
// persist.toRecords() without polluting the public SourceResult shape. The
// WeakMap holds no strong reference to result, so the data is GC-eligible once
// result is dropped.
// ---------------------------------------------------------------------------
const _rawHtmlStore = new WeakMap<SourceResult, { html: string; contentType: string }>();

// ---------------------------------------------------------------------------
// SSRF protection: private/loopback/link-local hostname pattern.
// Matches localhost, IPv4 loopback (127.x.x.x), link-local (169.254.x.x),
// RFC-1918 private ranges (10.x, 172.16–31.x, 192.168.x), and the
// "any-address" 0.0.0.0. IPv6 loopback [::1] / ::1 is also blocked below.
// ---------------------------------------------------------------------------
const PRIVATE_HOST_RE =
	/^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i;

/** Shape of the single entry in a webpage `SourceResult.items`. */
interface WebpageItem {
	url: string;
	title: string;
	textLength: number;
	text: string;
}

/**
 * Decode HTML entities — both named common entities and numeric refs
 * (decimal &#160; and hex &#x26; / &#XA0;).
 */
function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ")
		.replace(/&#([xX][0-9a-fA-F]+|\d+);/g, (_, ref: string) => {
			const codePoint = ref[0] === "x" || ref[0] === "X"
				? parseInt(ref.slice(1), 16)
				: parseInt(ref, 10);
			// Guard against invalid code points to avoid fromCodePoint throwing.
			if (codePoint < 0 || codePoint > 0x10ffff) return "";
			try {
				return String.fromCodePoint(codePoint);
			} catch {
				return "";
			}
		});
}

/**
 * Remove <script>, <style>, <noscript> blocks (including their inner content),
 * strip all remaining HTML tags, decode common entities, collapse whitespace,
 * and cap the result at 20 000 characters.
 */
function extractText(html: string): string {
	// Step 1 — remove block elements with their content.
	let text = html.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, "");

	// Step 2 — strip all remaining tags.
	text = text.replace(/<[^>]+>/g, "");

	// Step 3 — decode HTML entities (named + numeric decimal + numeric hex).
	text = decodeEntities(text);

	// Step 4 — collapse whitespace.
	text = text.replace(/\s+/g, " ").trim();

	// Step 5 — cap.
	return text.slice(0, 20_000);
}

/**
 * Extract the page title from raw HTML.
 * Returns an empty string when no <title> element is found.
 */
function extractTitle(html: string): string {
	const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	return m ? decodeEntities(m[1].trim()) : "";
}

export const webpage: DataSource = {
	id: "webpage",
	name: "Web Page Content",
	description:
		"Fetch and read the content of any web page by URL — 网页内容 / 抓取网页 / 读取链接 / 网页正文 / 提取网页文字. " +
		"Pass a fully-qualified URL in `url` (e.g. 'https://example.com/article'). " +
		"Returns the page title, extracted readable text (scripts/styles stripped, entities decoded, " +
		"up to 20 000 characters), and the raw text length. " +
		"The full raw HTML is stored in the object store; the extracted text is FTS-indexed. " +
		"No API key required. Use this when the user shares a link and asks you to read, summarise, " +
		"or answer questions about its content.",
	params: [
		{
			name: "url",
			type: "string",
			required: true,
			description:
				"Fully-qualified URL of the page to fetch, e.g. 'https://example.com/article'.",
		},
	],

	// Persist: store raw HTML in the blob store and extracted text in the FTS
	// record index. The URL is the natural dedup key — re-fetching the same URL
	// upserts (overwrites) the prior snapshot.
	persist: {
		shape: "records",
		retention: { rawTtlDays: 60 },
		toRecords(result: SourceResult): RecordInput[] {
			const item = (result.items as WebpageItem[])[0];
			if (!item) return [];
			// The raw HTML was captured alongside the result (see fetch() below).
			// We carry it via a module-private WeakMap keyed on the result object.
			const { html: rawHtml, contentType } = _rawHtmlStore.get(result) ?? { html: "", contentType: "text/html" };
			return [
				{
					source: "webpage",
					itemKey: item.url,
					ts: result.fetchedAt,
					title: item.title || undefined,
					summary: result.summary,
					body: item.text,
					url: item.url,
					blob: { contentType, data: rawHtml },
				},
			];
		},
		// A URL param is always a narrowing param — the cached snapshot must never
		// be served for a different URL than the one that was stored.
		snapshotEligible: () => false,
	},

	// No schedule property — this source is on-demand only.

	async fetch(params): Promise<SourceResult> {
		const rawUrl =
			typeof params.url === "string" ? params.url.trim() : "";
		if (!rawUrl) {
			throw new Error("webpage source requires a non-empty 'url' param");
		}

		// --- SSRF protection ---------------------------------------------------
		// Parse the URL early so we can inspect protocol and hostname before
		// issuing any network request. This prevents fetching internal services,
		// cloud metadata endpoints (169.254.169.254), or non-HTTP schemes.
		let parsed: URL;
		try {
			parsed = new URL(rawUrl);
		} catch {
			throw new Error(`webpage source: invalid URL — ${rawUrl}`);
		}

		if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
			throw new Error(
				`webpage source: only http: and https: URLs are allowed (got ${parsed.protocol})`,
			);
		}

		const hostname = parsed.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets
		if (
			hostname === "::1" ||
			PRIVATE_HOST_RE.test(hostname)
		) {
			throw new Error(
				`webpage source: fetching private/loopback/link-local hosts is not allowed (${hostname})`,
			);
		}
		// -----------------------------------------------------------------------

		const url = rawUrl;

		const res = await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (compatible; NanoBee/1.0; +https://nanobee.app)",
			},
			signal: AbortSignal.timeout(12_000),
		});

		if (!res.ok) {
			throw new Error(
				`webpage fetch failed: ${res.status} ${res.statusText}`,
			);
		}

		// --- Response size cap (header-based) ----------------------------------
		const contentLength = res.headers.get("content-length");
		if (contentLength !== null && Number(contentLength) > 5_000_000) {
			throw new Error(
				`webpage fetch: response is too large (content-length: ${contentLength} bytes; limit is 5 000 000)`,
			);
		}
		// -----------------------------------------------------------------------

		// --- Content-type guard ------------------------------------------------
		// We only know how to extract text from HTML/XHTML/XML responses.
		const ct = res.headers.get("content-type") ?? "";
		const ctLower = ct.split(";")[0].trim().toLowerCase();
		const isAcceptable =
			ctLower === "text/html" ||
			ctLower === "application/xhtml+xml" ||
			ctLower === "text/xml" ||
			ctLower === "application/xml";
		if (!isAcceptable) {
			throw new Error(
				`webpage fetch: unsupported content-type "${ct}" — only HTML/XHTML/XML responses are accepted`,
			);
		}
		// -----------------------------------------------------------------------

		const html = await res.text();
		if (!html) {
			throw new Error("webpage fetch returned an empty body");
		}

		const title = extractTitle(html);
		const text = extractText(html);
		if (!text) {
			throw new Error(
				"webpage fetch returned no extractable text — page may be JS-only or empty",
			);
		}

		const textLength = text.length;
		const summary = `${title || "(no title)"} (${url}) — ${textLength} chars extracted`;

		const result: SourceResult = {
			source: webpage.id,
			fetchedAt: new Date().toISOString(),
			summary,
			items: [{ url, title, textLength, text } satisfies WebpageItem],
		};

		// Stash the raw HTML and the actual content-type so toRecords() can attach
		// it as a blob without re-fetching. The WeakMap holds no strong reference
		// to result, so the data is GC-eligible as soon as result is dropped.
		_rawHtmlStore.set(result, { html, contentType: ct || "text/html" });

		return result;
	},
};
