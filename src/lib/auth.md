# 认证服务函数说明

## 需求背景
- 将首页与根路由需要的认证能力集中到 `src/lib/auth.ts`。
- 提供统一的会话读取、OAuth 配置读取、Google One Tap 凭据校验能力，避免页面层重复拼接环境变量与鉴权逻辑。

## 当前进度
- 总进度：100%
- 已完成：
  - 提供 `getSession`：从 `demo_session` Cookie 中解析用户基础信息。
  - 提供 `getOAuthConfig`：统一返回 `authIssuer/clientId/redirectUri`。
  - 提供 `verifyGoogleOneTap`：调用 Google `tokeninfo` 校验凭据并返回标准化用户信息。
- 待完成：
  - 无

## 实现细节
1. 环境变量读取
- 通过 `getAuthEnv` 统一读取 `AUTH_*` 与 `VITE_AUTH_*`，并提供默认 issuer。

2. 会话读取
- `parseCookieHeader` 解析 `Cookie` 字符串。
- `decodeJwt` 仅做 payload 解析（demo 场景，不做签名验真）。
- `getSession` 读取 `demo_session` 并返回 `{ email, name, sub }`，无有效信息则返回 `null`。

3. Google One Tap 校验
- `verifyGoogleOneTap` 调用 `https://oauth2.googleapis.com/tokeninfo`。
- 校验 `aud`、`iss`、`email_verified`，不符合时抛错。
- 返回统一结构：`success/credential/user`。

## 功能验证计划
1. 运行 `npm run build`，确认服务函数可通过编译。
2. 启动 `npm run dev -- --host 127.0.0.1 --port 5173`。
3. 使用 Playwright 无头打开首页，确认页面可正常拉取配置并完成渲染。
4. 使用 Playwright 无头访问 `http://127.0.0.1:5173/oauth/callback?code=test`，确认回调流程执行后回到首页。

## 验证记录
- 验证时间：2026-02-22
- 结果：
  - `npm run build` 通过。
  - Playwright 无头访问 `/oauth/callback?code=test` 后最终路径为 `/`，说明 OAuth 配置读取和回调链路可用。
