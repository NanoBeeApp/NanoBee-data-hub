# Hono API Worker

## Requirements

- Create a Hono-based API Worker to handle all backend API requests
- Support RPC mode for type-safe frontend–backend communication
- Integrate common middleware (CORS, logging, etc.)
- Unified error handling and response format

## Implementation Details

### File Structure
```
src/worker/
├── api-worker.ts      # Worker entry point
├── config.ts          # Configuration file
└── routes/
    └── api.ts         # API route definitions
```

### Tech Stack
- **Hono**: lightweight web framework
- **@hono/zod-validator**: Zod validator middleware
- **zod**: data validation library

### Middleware
1. **logger**: request logging middleware
2. **cors**: CORS cross-origin configuration
3. **zValidator**: request data validation

### Exported Types
Exports the `AppType` type for use by the frontend RPC client, enabling end-to-end type safety.

## Verification

### Verification Plan
1. Start the development server
2. Test the `/health` health-check endpoint
3. Test the `/api/hello` GET endpoint
4. Test the `/api/hello` POST endpoint
5. Test the `/api/users` GET and POST endpoints
6. Verify frontend RPC client calls

### Verification Steps
```bash
# 1. Start the development server
pnpm dev

# 2. Test the health check (using curl or a browser)
curl http://localhost:5173/health

# 3. Test the API endpoints
curl "http://localhost:5173/api/hello?name=John"
curl -X POST http://localhost:5173/api/hello -H "Content-Type: application/json" -d '{"name":"John"}'

# 4. Test RPC calls from the frontend page
# Open a browser at http://localhost:5173 and check the console logs
```

## Current Status
✅ Base architecture complete
✅ Example endpoints implemented
⏳ Pending: integration into the frontend page

## Change history

### 2026-06-15 — storage bindings on Env
- **Motivation**: the storage layer needs the D1 (and optional R2) bindings.
- **Goal**: add `DB?` and `BLOBS?` to the `Env` type (typed `unknown`, resolved
  by `storage/getStore`) alongside the existing `TWELVE_DATA_KEY`.

### 2026-06-15 — FINNHUB_KEY on Env (Phase 2 news source)
- **Motivation**: the new `news` source needs a Finnhub credential.
- **Goal**: add `FINNHUB_KEY?: string` to `Env` (read server-side, injected via
  the gitignored `.dev.vars`; passed to Finnhub as the `X-Finnhub-Token` header,
  never in the URL).
