/**
 * Hono RPC client
 * Provides type-safe API calls
 */

import { hc } from 'hono/client';
import type { AppType } from '../worker/api-worker';

// Resolve the API base URL
function getApiBaseUrl() {
  // Browser environment: use the current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Server environment: return empty string — this client is not called server-side
  return '';
}

/**
 * Create a type-safe API client
 * Note: this client is intended for browser use only
 *
 * Usage:
 * ```typescript
 * const result = await apiClient.api.hello.$get({ query: { name: 'Alice' } });
 * const data = await result.json();
 * ```
 */
export const apiClient = hc<AppType>(getApiBaseUrl());

// Export type for use elsewhere
export type ApiClient = typeof apiClient;
