# sources/types.ts

## 文件职责
定义数据源注册表的统一契约：`DataSource` 接口、参数声明 `SourceParam`、可被 LLM 读取的 `SourceDescriptor`、归一化返回 `SourceResult`。这是「不写死路由、数据源可无限扩展」的基础。

## 核心导出 / API
- `SourceParam` — 单个参数声明（name/type/description/required/enum/default），既驱动校验也作为给 LLM 的机读 schema
- `SourceDescriptor` — 数据源的公开描述（id/name/description/params），不含抓取逻辑
- `SourceResult` — 每个源返回的归一化结构（source/fetchedAt/summary/items），`summary` 为可直接拼进 prompt 的文本摘要
- `DataSource` — 描述 + `fetch(params, env)` 抓取逻辑

## 依赖关系
- 上游：被 `registry.ts`、各数据源模块（如 `hackernews.ts`）、`routes/sources.ts` 引用
- 下游：无

## 关键实现思路
- `summary` 字段是关键：消费方（NanoBee）拿到后无需理解每个源的 items 结构即可直接注入 LLM 上下文。

## 变更历史

### 2026-06-12 — 创建
- **出发点**：用户要走通「HN 开发者新闻」流程，但强调数据源可能无限多种、不要写死路由
- **目标**：用一个统一接口承载任意数据源，HTTP 层做成通用 catalog + invoke
- **关键决策**：用 `summary` 归一化文本让消费方零成本注入上下文
