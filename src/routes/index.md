# 首页（含 Google One Tap）说明

## 需求背景
- 现象：控制台出现 `One Tap 被跳过: unknown_reason`，无法快速定位是配置、浏览器策略还是用户交互导致。
- 目标：在不改变主流程的前提下，补齐 One Tap 初始化与提示阶段日志，提供可读原因说明，并降低重复初始化带来的噪音。

## 当前进度
- 总进度：100%
- 已完成：
  - 在 `src/routes/index.tsx` 新增 One Tap 详细日志（字符串 + 对象双输出）。
  - 增加 `prompt` 回调解析，区分 `not_displayed / skipped / dismissed / displayed`。
  - 为 `unknown_reason` 等常见原因补充中文解释。
  - 增加 Google GSI 脚本单例加载与 One Tap 重复初始化保护。
- 待完成：
  - 无

## 实现细节
1. 日志策略
- 所有关键节点都使用统一前缀 ` [Header.useEffect] `。
- 前端日志按“先字符串、后对象”输出，便于复制与调试。
- 覆盖节点：
  - 用户已登录/缺失 Client ID 的提前返回。
  - GSI 脚本加载开始、成功、失败。
  - One Tap 初始化与 `prompt` 触发。
  - credential 回调成功/失败。

2. 原因解析
- 为 `prompt` 回调新增解析函数，将状态拆分为：
  - `displayed`
  - `not_displayed`
  - `skipped`
  - `dismissed`
- 对常见 reason code 建立中文说明映射。
- 对未预置 reason 返回兜底文案，避免再次出现“仅有 unknown_reason 无解释”的问题。

3. 重复初始化防护
- 使用 `window.__googleOneTapInitialized` 记录是否已经初始化。
- 脚本使用固定 id `google-gsi-client-script`，避免重复注入。
- 检测到已有脚本时直接复用并尝试初始化。

## 功能验证计划
1. 启动：`npm run dev -- --host 127.0.0.1 --port 5173`
2. Playwright headless 打开首页 `http://127.0.0.1:5173`
3. 检查页面可正常加载且无脚本报错
4. 观察浏览器控制台 One Tap 日志是否包含：
- 初始化开始/完成
- prompt 结果（displayed 或 skipped/not_displayed 的具体原因）
5. 验证登录按钮仍可点击（不要求真实第三方登录完成）

## 验证记录
- 验证时间：2026-02-21
- 开发服务器：`npm run dev -- --host 127.0.0.1 --port 5173`
- Playwright（headless）关键结果：
  - 打开 `http://127.0.0.1:5173/` 成功，首页可正常渲染。
  - 控制台出现 One Tap 初始化日志：脚本加载开始/完成、初始化完成并触发 prompt。
  - 复现到 `One Tap 被跳过: unknown_reason` 时，日志现已包含结构化解释：
    - `moment: skipped`
    - `reason: unknown_reason`
    - `reasonDescription: 浏览器只返回了通用跳过原因（常见于隐私限制/FedCM）。`
  - 页面交互未中断，`Test Server Function` 按钮可点击。
- 额外观察：
  - headless 环境会出现 `Provider's accounts list is empty` 与 `FedCM get() rejects with NetworkError`，属于无可用 Google 账户场景，与页面逻辑错误可区分。
