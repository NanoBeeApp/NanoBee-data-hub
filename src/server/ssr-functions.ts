import { createServerFn } from "@tanstack/react-start";

// SSR 示例：获取服务端时间和环境信息
export const getServerInfo = createServerFn({ method: "GET" }).handler(
  async () => {
    // 模拟服务端数据获取（可以是数据库查询、外部 API 调用等）
    const now = new Date();
    return {
      serverTime: now.toISOString(),
      serverTimeFormatted: now.toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
      }),
      runtime: "Cloudflare Workers",
      renderType: "SSR (服务端渲染)",
    };
  }
);

// SSR 示例：模拟获取文章列表（服务端数据预取）
export const getArticles = createServerFn({ method: "GET" }).handler(
  async () => {
    // 模拟数据库查询延迟
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      articles: [
        {
          id: 1,
          title: "TanStack Start SSR 入门",
          summary: "了解如何使用 TanStack Start 实现服务端渲染",
          date: "2025-01-15",
        },
        {
          id: 2,
          title: "Cloudflare Workers 部署指南",
          summary: "将全栈应用部署到 Cloudflare Workers 边缘网络",
          date: "2025-01-10",
        },
        {
          id: 3,
          title: "Hono RPC 类型安全通信",
          summary: "使用 Hono RPC 实现前后端类型安全的 API 调用",
          date: "2025-01-05",
        },
      ],
      fetchedAt: new Date().toISOString(),
    };
  }
);
