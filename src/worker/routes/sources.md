# routes/sources.ts

## 文件职责
数据源的通用 HTTP 接口，服务注册表里所有源，无需为每个源单独写路由。

## 核心导出 / API
- `sourceRoutes: Hono` 挂载于 `/api/sources`
  - `GET /api/sources` — 返回 catalog `{ sources: SourceDescriptor[] }`
  - `POST /api/sources/:id/fetch` — 以 JSON body 作参数调用指定源，返回 `SourceResult`；未知源 404，源抛错 502

## 依赖关系
- 上游：`api-worker.ts` 挂载
- 下游：`../sources/registry`（listSources/getSource/coerceParams）

## 关键实现思路
- 容忍空/缺失 body（参数全可选时直接调用）。
- 抓取失败返回 502 + detail，便于消费方降级。

## 变更历史

### 2026-06-12 — 创建
- **出发点**：让无限多种数据源共用同一套发现 + 调用接口
- **目标**：catalog 发现 + 按 id 通用调用
- **关键决策**：两条端点覆盖全部源，新增源自动出现在 catalog
