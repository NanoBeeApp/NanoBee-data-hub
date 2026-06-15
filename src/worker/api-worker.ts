/**
 * Hono API Worker
 * Entry point for all backend endpoints and business logic
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { CONFIG } from './config';
import { apiRoutes } from './routes/api';
import { mcpRoutes } from './routes/mcp';
import { sourceRoutes } from './routes/sources';

// Define the Worker environment type
export type Env = {
  // Add Cloudflare Workers bindings here
  // e.g.: MY_KV: KVNamespace;
  /** Twelve Data API key used by the gold source (project-level source credential). */
  TWELVE_DATA_KEY?: string;
};

// Create the Hono app instance
const app = new Hono<{ Bindings: Env }>();

// Register middleware
app.use('*', logger()); // logging middleware
app.use('*', cors(CONFIG.CORS)); // CORS middleware

// Mount API routes
app.route('/api', apiRoutes);
// Generic data-source gateway (catalog + invoke); see routes/sources.ts
app.route('/api/sources', sourceRoutes);
// Standard MCP server over the same registry; see routes/mcp.ts
app.route('/mcp', mcpRoutes);

// Health-check endpoint
app.get('/health', (c) => {
  return c.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
});

// Export type for client usage
export type AppType = typeof apiRoutes;

export default app;
