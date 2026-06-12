# server.ts

## 文件职责
data-hub 的自定义 Worker 入口（被 `wrangler.json` 的 `main` 引用）。把 `/api/*` 和 `/health` 分发到 Hono worker，其余交给 TanStack Start 默认 handler。

## 核心导出 / API
- `default { fetch(request, env, ctx) }`

## 依赖关系
- 上游：`wrangler.json` `main: "src/server.ts"`
- 下游：`@tanstack/react-start/server-entry`、`./worker/api-worker`

## 关键实现思路
- TanStack Start 从 `src/server.ts` 解析自定义入口，且 `wrangler.json main` 必须指向它——旧模板的 `server-entry.ts`/`ssr.tsx` 是死代码，从不被加载（见经验：tanstack-start-cloudflare-server-entry）。

## 变更历史

### 2026-06-12 — 创建
- **出发点**：data-hub 仍是旧模板配置，`/api/*` 全被 TanStack Router 404 接管，Hono 路由不生效
- **目标**：让 `/api/sources` 等接口真正路由到 Hono
- **关键决策**：照 NanoBee 已验证方案，建 `src/server.ts` 并把 `main` 从包入口改为它
