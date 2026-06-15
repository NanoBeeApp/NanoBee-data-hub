/**
 * Storage factory.
 *
 * Resolves the concrete `DataStore` for the current runtime from the Worker
 * env. On Cloudflare that means a `D1Store` when the `DB` (D1) binding is
 * present. When no storage is bound the hub degrades gracefully to its original
 * behaviour: `getStore()` returns `null` and the read path serves live data
 * only — so the gateway keeps working before D1 is provisioned.
 *
 * A self-hosted build would branch here to return a SqliteStore/PgStore from
 * the same env; callers only ever see the `DataStore` interface.
 */

import { D1Store } from "./d1-store";
import type { DataStore } from "./types";

/** Bindings the storage layer may consume (subset of the Worker Env). */
export interface StoreEnv {
	DB?: unknown;
	BLOBS?: unknown;
}

export function getStore(env: unknown): DataStore | null {
	const e = (env ?? {}) as StoreEnv;
	if (e.DB) {
		return new D1Store({ DB: e.DB as never, BLOBS: e.BLOBS as never });
	}
	return null;
}

export type { DataStore } from "./types";
export * from "./types";
