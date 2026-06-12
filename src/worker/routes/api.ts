/**
 * API 路由
 * 定义所有业务接口
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../api-worker';

export const apiRoutes = new Hono<{ Bindings: Env }>()
  // GET /api/hello - 简单的问候接口
  .get('/hello', (c) => {
    const name = c.req.query('name') || 'World';
    console.log('[API] GET /api/hello, name:', name);
    return c.json({
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
    });
  })

  // POST /api/hello - 带请求体的问候接口
  .post(
    '/hello',
    zValidator(
      'json',
      z.object({
        name: z.string().min(1, '名字不能为空'),
      })
    ),
    (c) => {
      const { name } = c.req.valid('json');
      console.log('[API] POST /api/hello, name:', name);
      return c.json({
        message: `你好，${name}！`,
        timestamp: new Date().toISOString(),
      });
    }
  )

  // GET /api/users - 获取用户列表示例
  .get('/users', (c) => {
    console.log('[API] GET /api/users');
    // 模拟数据
    const users = [
      { id: 1, name: '张三', email: 'zhangsan@example.com' },
      { id: 2, name: '李四', email: 'lisi@example.com' },
      { id: 3, name: '王五', email: 'wangwu@example.com' },
    ];
    return c.json({ users });
  })

  // POST /api/users - 创建用户示例
  .post(
    '/users',
    zValidator(
      'json',
      z.object({
        name: z.string().min(1, '用户名不能为空'),
        email: z.string().email('邮箱格式不正确'),
      })
    ),
    (c) => {
      const data = c.req.valid('json');
      console.log('[API] POST /api/users, data:', JSON.stringify(data));
      console.log('[API] POST /api/users, data:', data);

      // 模拟创建用户
      const newUser = {
        id: Date.now(),
        ...data,
        createdAt: new Date().toISOString(),
      };

      return c.json(newUser, 201);
    }
  );
