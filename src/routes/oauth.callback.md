# OAuth 回调路由

## 需求
- 将前端 OAuth 回调路由从 `/oauth/demo/callback` 调整为 `/oauth/callback`。
- 保持授权码换取 token 的核心流程不变。
- 确保本地环境示例配置中的回调地址与新路由一致。

## 实现细节
- 路由文件改名：`oauth.demo.callback.tsx` -> `oauth.callback.tsx`。
- 更新 `createFileRoute` 路径为 `/oauth/callback`。
- 更新默认 `redirectUri` 回退值为 `${window.location.origin}/oauth/callback`。
- 同步更新 `.env.example` 中 `VITE_AUTH_REDIRECT_URI` 与 `AUTH_REDIRECT_URI`。

## 功能验证计划
1. 启动开发服务器，确认项目能正常编译启动。
2. 访问 `/oauth/callback?code=test`，确认会进入回调处理逻辑并跳转回首页。
3. 直接访问旧地址 `/oauth/demo/callback`，确认不再匹配旧回调页面。
4. 检查 `.env.example`，确认回调地址已更新为新路径。

## 验证结果
- 已启动开发服务器（`npm run dev -- --host 127.0.0.1 --port 5173`），项目正常启动。
- 使用 Playwright 无头模式访问 `http://127.0.0.1:5173/oauth/callback?code=test`，最终路径为 `/`，说明新回调路由已生效并触发回调逻辑。
- 使用 Playwright 无头模式访问 `http://127.0.0.1:5173/oauth/demo/callback`，页面文本为 `Not Found`，说明旧回调路由已失效。
- 通过命令检查 `.env.example`，确认以下两项均为新路径：
  - `VITE_AUTH_REDIRECT_URI=http://localhost:5173/oauth/callback`
  - `AUTH_REDIRECT_URI=http://localhost:5173/oauth/callback`
- 执行 `npm run build` 构建通过，产物中已生成 `oauth.callback` 对应构建文件。
