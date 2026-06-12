/**
 * API routes
 * Defines all business endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../api-worker';

export const apiRoutes = new Hono<{ Bindings: Env }>()
  // GET /api/hello - simple greeting endpoint
  .get('/hello', (c) => {
    const name = c.req.query('name') || 'World';
    console.log('[API] GET /api/hello, name:', name);
    return c.json({
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
    });
  })

  // POST /api/hello - greeting endpoint with request body
  .post(
    '/hello',
    zValidator(
      'json',
      z.object({
        name: z.string().min(1, 'Name is required'),
      })
    ),
    (c) => {
      const { name } = c.req.valid('json');
      console.log('[API] POST /api/hello, name:', name);
      return c.json({
        message: `Hello, ${name}!`,
        timestamp: new Date().toISOString(),
      });
    }
  )

  // GET /api/users - example: retrieve user list
  .get('/users', (c) => {
    console.log('[API] GET /api/users');
    // Mock data
    const users = [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
      { id: 3, name: 'Charlie', email: 'charlie@example.com' },
    ];
    return c.json({ users });
  })

  // POST /api/users - example: create a user
  .post(
    '/users',
    zValidator(
      'json',
      z.object({
        name: z.string().min(1, 'Username is required'),
        email: z.string().email('Invalid email format'),
      })
    ),
    (c) => {
      const data = c.req.valid('json');
      console.log('[API] POST /api/users, data:', JSON.stringify(data));
      console.log('[API] POST /api/users, data:', data);

      // Simulate user creation
      const newUser = {
        id: Date.now(),
        ...data,
        createdAt: new Date().toISOString(),
      };

      return c.json(newUser, 201);
    }
  );
