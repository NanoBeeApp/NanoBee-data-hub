# sources/hackernews.ts

## 文件职责
Hacker News 数据源实现。基于公开的 Algolia HN Search API（无需 key），返回 HN 首页热门故事或按关键词搜索的故事。

## 核心导出 / API
- `hackerNews: DataSource` — id=`hackernews`
- 参数：`query`（可选关键词，省略则取首页）、`limit`（1-30，默认 10）
- 返回 `SourceResult`：`items` 为 {title,url,author,points,comments,createdAt}，`summary` 为带序号的可注入文本

## 依赖关系
- 上游：`registry.ts` 注册
- 下游：`./types`、Algolia HN API（`https://hn.algolia.com/api/v1`）

## 关键实现思路
- 无 `query` 用 `tags=front_page`（首页 = 今天的热门开发者新闻）；有 `query` 用 `tags=story` 全文搜索。
- 10s 超时；过滤无 title 的 hit；无 url 时回退到 HN item 链接。

## 变更历史

### 2026-06-12 — 创建
- **出发点**：走通「今天 HN 有什么开发者新闻」流程需要 HN 数据源
- **目标**：作为注册表的首个具体数据源
- **关键决策**：选 Algolia front_page 端点，最贴合「今天热门」语义，且免 key
