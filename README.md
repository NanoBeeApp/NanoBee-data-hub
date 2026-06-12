# Hono + Vite React Template

全栈开发模板：Hono API + React + Cloudflare Workers

## 技术栈

- **前端**: React 19 + Vite + Tailwind CSS v4 + shadcn/ui
- **后端**: Hono (运行在 Cloudflare Workers)
- **类型安全 RPC**: Hono Client
- **部署**: Cloudflare Workers

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 访问 http://localhost:5173
```

## 项目结构

```
├── src/
│   ├── web/                     # 前端 React
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── components/ui/       # shadcn 组件
│   │   ├── lib/
│   │   │   ├── rpcClient.ts     # Hono RPC 客户端
│   │   │   └── utils.ts
│   │   └── pages/Home.tsx
│   └── worker/                  # 后端 Hono API
│       └── index.ts
├── public/
├── index.html
├── vite.config.ts
├── wrangler.json
├── tsconfig.*.json
└── package.json
```

## 常用命令

```bash
# 开发
pnpm dev              # 启动开发服务器

# 构建
pnpm build            # 构建项目
pnpm preview          # 预览构建结果

# 部署
pnpm deploy           # 部署到 Cloudflare Workers

# 代码质量
pnpm lint             # ESLint 检查
pnpm test             # 运行测试
```

## API 示例

后端 API 位于 `src/worker/index.ts`：

```typescript
// 健康检查
GET /api/health

// Hello API
GET /api/hello?name=World
```

前端使用类型安全的 RPC 客户端调用：

```typescript
import { rpcClient } from "@/lib/rpcClient";

const res = await rpcClient.api.hello.$get({ query: { name: "Template" } });
const data = await res.json();
```

## 添加 Cloudflare 绑定

如需使用 D1、KV、R2 等服务，在 `wrangler.json` 中添加绑定配置：

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

然后在 `src/worker/index.ts` 中更新 Env 类型：

```typescript
type Env = {
  DB: D1Database;
  KV: KVNamespace;
};
```

## 添加 shadcn 组件

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add input
```
