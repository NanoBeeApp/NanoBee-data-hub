# SSR 示例页面

## 需求
展示 TanStack Start 的 SSR（服务端渲染）核心功能，包括路由 loader 数据预取和客户端水合。

## 实现细节
- 使用路由 `loader` 在服务端预取数据（serverInfo + articles）
- 通过 `Route.useLoaderData()` 在组件中获取预取数据
- 对比服务端渲染时间和客户端水合时间，直观展示 SSR 效果
- 提供 SSR 工作原理说明

## 组件拆分
- `SSRPage`: 主页面容器
- `SSRPageHeader`: 页面标题
- `ServerInfoCard`: 服务端信息展示
- `InfoRow`: 信息行
- `ArticleListCard`: 文章列表
- `ArticleItem`: 单篇文章
- `SSRExplanation`: SSR 原理说明
- `BackToHomeLink`: 返回首页

## 功能验证步骤
1. 访问 `/ssr` 页面，验证页面正常渲染
2. 确认服务端信息和文章列表直接显示（无 loading 状态）
3. 查看页面源代码，确认数据已嵌入 HTML
4. 验证服务端时间和客户端水合时间有差异
5. 点击"返回首页"按钮验证导航正常
6. 从首页点击 SSR 示例链接验证导航正常
