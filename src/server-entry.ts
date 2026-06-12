/**
 * 自定义服务器入口
 * 集成 Hono API Worker 和 TanStack Start
 */

import apiWorker from './worker/api-worker';
import startHandler from './ssr';

export default {
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url);

    console.log('[Server Entry] 请求:', request.method, url.pathname);

    // 如果是 API 请求或健康检查，交给 Hono 处理
    if (url.pathname.startsWith('/api') || url.pathname === '/health') {
      console.log('[Server Entry] 路由到 Hono API Worker');
      return apiWorker.fetch(request, env, ctx);
    }

    // 其他请求交给 TanStack Start 处理
    console.log('[Server Entry] 路由到 TanStack Start');
    return startHandler(request, env);
  },
};
