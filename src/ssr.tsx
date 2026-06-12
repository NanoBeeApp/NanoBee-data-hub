import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { getRouter } from "./router";
import apiWorker from "./worker/api-worker";

// Create the TanStack Start handler
const startHandler = createStartHandler({
  createRouter: getRouter,
  getRouterManifest: () => import("./routeTree.gen").then((m) => m.manifest),
})(defaultStreamHandler);

// Export custom handler that integrates the Hono API Worker
export default async (request: Request, env: any) => {
  const url = new URL(request.url);

  // Route API requests and health checks to Hono
  if (url.pathname.startsWith('/api') || url.pathname === '/health') {
    return apiWorker.fetch(request, env);
  }

  // All other requests go to TanStack Start
  return startHandler(request, env);
};
