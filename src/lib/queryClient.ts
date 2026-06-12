import { QueryClient } from "@tanstack/react-query";

// 创建 TanStack Query 客户端
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // 窗口聚焦时不自动重新请求
      retry: 1, // 失败后重试1次
    },
  },
});
