/**
 * Custom server entry
 * Integrates the Hono API Worker with TanStack Start
 */

import apiWorker from './worker/api-worker';
import startHandler from './ssr';

export default {
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url);

    console.log('[Server Entry] request:', request.method, url.pathname);

    // Route API requests and health checks to Hono
    if (url.pathname.startsWith('/api') || url.pathname === '/health') {
      console.log('[Server Entry] routing to Hono API Worker');
      return apiWorker.fetch(request, env, ctx);
    }

    // All other requests go to TanStack Start
    console.log('[Server Entry] routing to TanStack Start');
    return startHandler(request, env);
  },
};
