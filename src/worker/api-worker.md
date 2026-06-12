# Hono API Worker

## 需求

- 创建基于 Hono 的 API Worker，处理所有后端接口请求
- 支持 RPC 模式，提供类型安全的前后端通信
- 集成常用中间件（CORS、日志等）
- 统一的错误处理和响应格式

## 实现细节

### 文件结构
```
src/worker/
├── api-worker.ts      # Worker 主入口
├── config.ts          # 配置文件
└── routes/
    └── api.ts         # API 路由定义
```

### 技术栈
- **Hono**: 轻量级 Web 框架
- **@hono/zod-validator**: Zod 验证器中间件
- **zod**: 数据验证库

### 中间件
1. **logger**: 请求日志中间件
2. **cors**: CORS 跨域配置
3. **zValidator**: 请求数据验证

### 导出类型
导出 `AppType` 类型供前端 RPC 客户端使用，实现端到端类型安全。

## 功能验证

### 验证计划
1. 启动开发服务器
2. 测试 `/health` 健康检查接口
3. 测试 `/api/hello` GET 接口
4. 测试 `/api/hello` POST 接口
5. 测试 `/api/users` GET 和 POST 接口
6. 验证前端 RPC 客户端调用

### 验证步骤
```bash
# 1. 启动开发服务器
pnpm dev

# 2. 测试健康检查（使用 curl 或浏览器）
curl http://localhost:5173/health

# 3. 测试 API 接口
curl "http://localhost:5173/api/hello?name=张三"
curl -X POST http://localhost:5173/api/hello -H "Content-Type: application/json" -d '{"name":"张三"}'

# 4. 在前端页面测试 RPC 调用
# 打开浏览器访问 http://localhost:5173 并查看控制台日志
```

## 当前状态
✅ 已完成基础架构
✅ 已实现示例接口
⏳ 待集成到前端页面
