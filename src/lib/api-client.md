# API 客户端

## 需求

- 创建类型安全的 Hono RPC 客户端
- 自动获取正确的 API 基础 URL（开发/生产环境）
- 提供简洁的 API 调用方式
- 完整的 TypeScript 类型推导

## 实现细节

### 核心功能
- 使用 `hono/client` 的 `hc` 函数创建客户端
- 导入后端的 `AppType` 类型实现类型安全
- 自动适配当前域名作为 API 基础 URL

### 使用方式

#### GET 请求
```typescript
import { apiClient } from '@/lib/api-client';

// 带查询参数
const result = await apiClient.api.hello.$get({
  query: { name: '张三' }
});
const data = await result.json();

// 无参数
const result = await apiClient.api.users.$get();
const data = await result.json();
```

#### POST 请求
```typescript
// 带 JSON body
const result = await apiClient.api.hello.$post({
  json: { name: '张三' }
});
const data = await result.json();

// 创建用户
const result = await apiClient.api.users.$post({
  json: {
    name: '李四',
    email: 'lisi@example.com'
  }
});
const newUser = await result.json();
```

### 类型安全
所有的请求参数和响应数据都有完整的类型推导：
- 请求参数类型检查
- 响应数据类型推导
- 编译时错误检测

## 功能验证

### 验证计划
1. 在 React 组件中导入并使用客户端
2. 测试各种 API 调用
3. 验证类型安全性
4. 检查错误处理

### 验证方法
在浏览器控制台查看：
- 请求是否成功发送
- 响应数据格式是否正确
- TypeScript 类型提示是否准确
- 错误情况的处理

## 当前状态
✅ 已完成客户端创建
⏳ 待在组件中使用
⏳ 待添加错误处理
