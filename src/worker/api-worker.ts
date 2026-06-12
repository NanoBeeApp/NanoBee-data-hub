/**
 * Hono API Worker
 * Entry point for all backend endpoints and business logic
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { CONFIG } from './config';
import { apiRoutes } from './routes/api';

// Define the Worker environment type
export type Env = {
  // Add Cloudflare Workers bindings here
  // e.g.: MY_KV: KVNamespace;
};

// Create the Hono app instance
const app = new Hono<{ Bindings: Env }>();

// Register middleware
app.use('*', logger()); // logging middleware
app.use('*', cors(CONFIG.CORS)); // CORS middleware

// Mount API routes
app.route('/api', apiRoutes);

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
