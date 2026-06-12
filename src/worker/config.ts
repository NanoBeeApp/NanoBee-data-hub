/**
 * Worker configuration
 * Central management of all constants and settings
 */

export const CONFIG = {
  // API route prefix
  API_PREFIX: '/api',

  // CORS settings
  CORS: {
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  },
} as const;
