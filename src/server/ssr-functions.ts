import { createServerFn } from "@tanstack/react-start";

// SSR example: fetch server time and environment info
export const getServerInfo = createServerFn({ method: "GET" }).handler(
  async () => {
    // Simulate server-side data fetching (could be a DB query, external API call, etc.)
    const now = new Date();
    return {
      serverTime: now.toISOString(),
      serverTimeFormatted: now.toLocaleString("en-US", {
        timeZone: "UTC",
      }),
      runtime: "Cloudflare Workers",
      renderType: "SSR (Server-Side Rendering)",
    };
  }
);

// SSR example: simulate fetching an article list (server-side data prefetch)
export const getArticles = createServerFn({ method: "GET" }).handler(
  async () => {
    // Simulate database query latency
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      articles: [
        {
          id: 1,
          title: "Getting Started with TanStack Start SSR",
          summary: "Learn how to implement server-side rendering with TanStack Start",
          date: "2025-01-15",
        },
        {
          id: 2,
          title: "Cloudflare Workers Deployment Guide",
          summary: "Deploy a full-stack application to the Cloudflare Workers edge network",
          date: "2025-01-10",
        },
        {
          id: 3,
          title: "Type-Safe Communication with Hono RPC",
          summary: "Use Hono RPC for end-to-end type-safe API calls between client and server",
          date: "2025-01-05",
        },
      ],
      fetchedAt: new Date().toISOString(),
    };
  }
);
