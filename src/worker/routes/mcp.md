# src/worker/routes/mcp.ts

## Responsibility
Standard MCP (Model Context Protocol) server endpoint over the same
data-source registry. Any MCP client (NanoBee's agent loop, Claude Code,
etc.) can discover and call the hub's sources without bespoke glue.

## Core exports / API
- `mcpRoutes: Hono` mounted at `/mcp` — single POST endpoint, JSON-RPC 2.0,
  stateless streamable HTTP (no session, no SSE stream)
  - `initialize` → protocol version + server info + tools capability
  - `ping` → `{}`
  - `tools/list` → every registered source as an MCP tool (inputSchema
    derived from its declared params)
  - `tools/call` → `coerceParams` + `source.fetch`; the `summary` digest is
    returned as a text content block; failures return `isError: true`
  - notifications (no id) → 202 empty body; GET → 405

## Dependencies
- Upstream: mounted by `api-worker.ts`; dispatched by `src/server.ts`
- Downstream: `../sources/registry`

## Notes
- Tool errors are reported in-band (`isError` result) per the MCP spec, not
  as JSON-RPC errors — clients feed them back to the model.
- Batch requests are rejected (single-message servers are spec-compliant).

## Change history

### 2026-06-12 — created
- **Motivation**: NanoBee's agent loop gained an MCP client; exposing the
  registry as a standard MCP server makes the hub consumable by any MCP
  client and dogfoods the protocol end-to-end locally.
- **Key decision**: stateless plain-JSON implementation (~140 lines, no SDK)
  — sessions and SSE streams add nothing for a read-only tools server.
