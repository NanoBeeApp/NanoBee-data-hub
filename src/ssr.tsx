import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { getRouter } from "./router";
import apiWorker from "./worker/api-worker";

// 创建 TanStack Start 处理器
const startHandler = createStartHandler({
  createRouter: getRouter,
  getRouterManifest: () => import("./routeTree.gen").then((m) => m.manifest),
})(defaultStreamHandler);

// 导出自定义处理器，集成 Hono API Worker
export default async (request: Request, env: any) => {
  const url = new URL(request.url);

  // 如果是 API 请求或健康检查，交给 Hono 处理
  if (url.pathname.startsWith('/api') || url.pathname === '/health') {
    return apiWorker.fetch(request, env);
  }

  // 其他请求交给 TanStack Start 处理
  return startHandler(request, env);
};
