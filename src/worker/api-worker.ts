/**
 * Hono API Worker
 * 所有后端接口和业务逻辑的入口
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { CONFIG } from './config';
import { apiRoutes } from './routes/api';

// 定义 Worker 环境类型
export type Env = {
  // 在这里添加 Cloudflare Workers 的 bindings
  // 例如: MY_KV: KVNamespace;
};

// 创建 Hono 应用实例
const app = new Hono<{ Bindings: Env }>();

// 添加中间件
app.use('*', logger()); // 日志中间件
app.use('*', cors(CONFIG.CORS)); // CORS 中间件

// 挂载 API 路由
app.route('/api', apiRoutes);

// 健康检查接口
app.get('/health', (c) => {
  return c.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
});

// 导出类型供客户端使用
export type AppType = typeof apiRoutes;

export default app;
