/**
 * MCP (Model Context Protocol) server endpoint.
 *
 * Exposes the same data-source registry as a standard MCP server over
 * streamable HTTP (single POST /mcp endpoint, JSON-RPC 2.0, stateless —
 * no session or SSE stream needed). Every registered source automatically
 * becomes an MCP tool, so any MCP client (NanoBee's agent loop, Claude
 * Code, etc.) can discover and call the hub's data without bespoke glue.
 *
 * Implemented methods: initialize, ping, tools/list, tools/call.
 * Notifications (no id) are acknowledged with 202 per the spec.
 */

import { Hono } from 'hono';
import type { Env } from '../api-worker';
import {
  coerceParams,
  getSource,
  listSources,
  redactSecretParams,
} from '../sources/registry';
import type { SourceParam } from '../sources/types';

const PROTOCOL_VERSION = '2025-03-26';
const SERVER_INFO = { name: 'nanobee-data-hub', version: '0.1.0' };

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

function rpcResult(id: JsonRpcRequest['id'], result: unknown) {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function rpcError(id: JsonRpcRequest['id'], code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

/** Convert a source's declared params to a JSON Schema input schema. */
function toInputSchema(params: SourceParam[]) {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const p of params) {
    properties[p.name] = {
      type: p.type,
      description: p.description,
      ...(p.enum ? { enum: p.enum } : {}),
      ...(p.default !== undefined ? { default: p.default } : {}),
    };
    if (p.required) required.push(p.name);
  }
  return { type: 'object', properties, ...(required.length ? { required } : {}) };
}

export const mcpRoutes = new Hono<{ Bindings: Env }>()
  // The spec allows GET for an SSE stream; this stateless server doesn't
  // need one, so reject politely.
  .get('/', (c) => c.json({ error: 'SSE stream not supported; POST JSON-RPC instead' }, 405))

  .post('/', async (c) => {
    let req: JsonRpcRequest | null = null;
    try {
      req = (await c.req.json()) as JsonRpcRequest;
    } catch {
      return c.json(rpcError(null, -32700, 'Parse error'), 400);
    }
    if (!req || Array.isArray(req) || typeof req.method !== 'string') {
      return c.json(rpcError(null, -32600, 'Invalid request (batches unsupported)'), 400);
    }

    const { id, method, params } = req;
    // tools/call arguments may carry secret params — redact before logging.
    if (method === 'tools/call') {
      const callee = typeof params?.name === 'string' ? getSource(params.name) : undefined;
      const args =
        params && typeof params.arguments === 'object' && params.arguments !== null
          ? (params.arguments as Record<string, unknown>)
          : {};
      console.log(
        '[MCP] request: tools/call',
        params?.name,
        // Unknown tool: keys only — the values could be anything, incl. secrets.
        callee
          ? JSON.stringify(redactSecretParams(callee.params, args))
          : `(unknown tool; arg keys: ${Object.keys(args).join(',')})`
      );
    } else {
      console.log('[MCP] request:', method, JSON.stringify(params ?? {}));
    }

    // Notifications carry no id and expect 202 with no body.
    if (id === undefined && method.startsWith('notifications/')) {
      return c.body(null, 202);
    }

    switch (method) {
      case 'initialize':
        return c.json(
          rpcResult(id, {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: SERVER_INFO,
          })
        );

      case 'ping':
        return c.json(rpcResult(id, {}));

      case 'tools/list':
        return c.json(
          rpcResult(id, {
            tools: listSources().map((s) => ({
              name: s.id,
              description: s.description,
              inputSchema: toInputSchema(s.params),
            })),
          })
        );

      case 'tools/call': {
        const name = typeof params?.name === 'string' ? params.name : '';
        const source = getSource(name);
        if (!source) {
          return c.json(rpcError(id, -32602, `Unknown tool: ${name}`));
        }
        const rawArgs =
          params && typeof params.arguments === 'object' && params.arguments !== null
            ? (params.arguments as Record<string, unknown>)
            : {};
        try {
          const result = await source.fetch(coerceParams(source.params, rawArgs), c.env);
          return c.json(
            rpcResult(id, { content: [{ type: 'text', text: result.summary }] })
          );
        } catch (error) {
          console.error('[MCP] tools/call failed:', name, String(error));
          return c.json(
            rpcResult(id, {
              content: [{ type: 'text', text: `Tool '${name}' failed: ${String(error)}` }],
              isError: true,
            })
          );
        }
      }

      default:
        return c.json(rpcError(id, -32601, `Method not found: ${method}`));
    }
  });
