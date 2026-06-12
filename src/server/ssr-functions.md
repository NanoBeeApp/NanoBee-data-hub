# SSR Server Functions

## 需求
为 SSR 示例页面提供服务端数据获取函数，展示 TanStack Start 的 Server Functions 在 SSR 场景下的用法。

## 实现细节
- `getServerInfo`: 获取服务端时间和运行环境信息，用于展示 SSR 渲染时间
- `getArticles`: 模拟获取文章列表，包含 100ms 延迟模拟数据库查询

## 功能验证
1. 在 SSR 页面中通过路由 loader 调用这些函数
2. 验证页面初始 HTML 中包含服务端数据（查看页面源码）
3. 验证客户端水合后页面正常交互
