/**
 * Worker 配置文件
 * 统一管理所有常量和配置
 */

export const CONFIG = {
  // API 路由前缀
  API_PREFIX: '/api',

  // CORS 配置
  CORS: {
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  },
} as const;
