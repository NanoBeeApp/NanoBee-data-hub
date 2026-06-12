/**
 * Hono RPC 客户端
 * 提供类型安全的 API 调用
 */

import { hc } from 'hono/client';
import type { AppType } from '../worker/api-worker';

// 获取 API 基础 URL
function getApiBaseUrl() {
  // 客户端环境：使用当前域名
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // 服务器端环境：返回空字符串，实际不会在服务器端调用
  return '';
}

/**
 * 创建类型安全的 API 客户端
 * 注意：这个客户端只在浏览器端使用
 *
 * 使用方式:
 * ```typescript
 * const result = await apiClient.api.hello.$get({ query: { name: '张三' } });
 * const data = await result.json();
 * ```
 */
export const apiClient = hc<AppType>(getApiBaseUrl());

// 导出类型以供其他地方使用
export type ApiClient = typeof apiClient;
