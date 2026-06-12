# sources/registry.ts

## 文件职责
集中注册所有数据源，并向 HTTP 层提供发现（`listSources`）、查找（`getSource`）、参数归一（`coerceParams`）能力。新增数据源只需 import 并加入 `SOURCES` 数组。

## 核心导出 / API
- `listSources(): SourceDescriptor[]` — 返回 catalog（仅描述，不含 fetch）
- `getSource(id): DataSource | undefined` — 按 id 查源
- `coerceParams(declared, raw)` — 按声明类型把原始参数转型并应用默认值

## 依赖关系
- 上游：`routes/sources.ts`
- 下游：`./types`、各数据源模块（`./hackernews` 等）

## 关键实现思路
- 用 `Map` 做 id→源索引，O(1) 查找。
- `coerceParams` 把解析/默认值逻辑收敛到一处，各源 `fetch` 专注业务。

## 变更历史

### 2026-06-12 — 创建
- **出发点**：避免每个数据源写一条专属路由
- **目标**：消费方通过 catalog 发现数据源，而非硬编码 id
- **关键决策**：注册表 + 通用 HTTP 层，新增源零路由改动
