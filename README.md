# Hono + Vite React Template

Full-stack development template: Hono API + React + Cloudflare Workers

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS v4 + shadcn/ui
- **Backend**: Hono (running on Cloudflare Workers)
- **Type-safe RPC**: Hono Client
- **Deployment**: Cloudflare Workers

## Quick Start

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev

# Visit http://localhost:5173
```

## Project Structure

```
├── src/
│   ├── web/                     # Frontend React
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── components/ui/       # shadcn components
│   │   ├── lib/
│   │   │   ├── rpcClient.ts     # Hono RPC client
│   │   │   └── utils.ts
│   │   └── pages/Home.tsx
│   └── worker/                  # Backend Hono API
│       └── index.ts
├── public/
├── index.html
├── vite.config.ts
├── wrangler.json
├── tsconfig.*.json
└── package.json
```

## Common Commands

```bash
# Development
pnpm dev              # Start the development server

# Build
pnpm build            # Build the project
pnpm preview          # Preview the build output

# Deployment
pnpm deploy           # Deploy to Cloudflare Workers

# Code quality
pnpm lint             # ESLint check
pnpm test             # Run tests
```

## API Examples

The backend API lives in `src/worker/index.ts`:

```typescript
// Health check
GET /api/health

// Hello API
GET /api/hello?name=World
```

The frontend calls it via the type-safe RPC client:

```typescript
import { rpcClient } from "@/lib/rpcClient";

const res = await rpcClient.api.hello.$get({ query: { name: "Template" } });
const data = await res.json();
```

## Adding Cloudflare Bindings

To use D1, KV, R2, or other services, add binding configuration in `wrangler.json`:

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "your-db",
      "database_id": "your-db-id"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "your-kv-id"
    }
  ]
}
```

Then update the `Env` type in `src/worker/index.ts`:

```typescript
type Env = {
  DB: D1Database;
  KV: KVNamespace;
};
```

## Adding shadcn Components

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add input
```
