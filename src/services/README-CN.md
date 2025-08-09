# API 客户端服务

此目录包含 MCP Chat UI 前端的 API 客户端实现。API 客户端提供了一个强大的、类型安全的接口，用于与后端服务通信。

## 功能特性

- **类型安全的 API 调用**，使用 TypeScript 接口
- **自动重试逻辑**，支持指数退避
- **请求/响应拦截器**，用于身份验证和日志记录
- **加载状态管理**，支持全局状态跟踪
- **全面的错误处理**，提供用户友好的错误消息
- **请求超时和取消**支持
- **缓存功能**，提升性能

## 核心组件

### ApiClient 类

主要的 `ApiClient` 类提供核心 HTTP 功能：

```typescript
import { ApiClient } from './apiClient';

const client = new ApiClient('https://api.example.com');

// 基本 HTTP 方法
const data = await client.get('/endpoint');
const result = await client.post('/endpoint', { data });
const updated = await client.put('/endpoint/1', { data });
await client.delete('/endpoint/1');
```

### 预配置的 API 端点

为常见操作提供类型安全的 API 端点：

```typescript
import { chatApi, settingsApi, healthApi } from './apiClient';

// 聊天操作
const response = await chatApi.sendMessage(request);
const toolResult = await chatApi.runTool(toolRequest);
const history = await chatApi.getChatHistory();

// 设置操作
const settings = await settingsApi.getSettings();
const updated = await settingsApi.updateSettings(newSettings);

// 健康检查
const health = await healthApi.checkHealth();
```

### React Hooks

提供多个 React hooks 以便于集成：

#### useApiCall

用于单个 API 调用，包含加载和错误状态：

```typescript
import { useApiCall } from '../hooks/useApiClient';

const { execute, isLoading, error, data } = useApiCall();

const handleSubmit = async () => {
  try {
    const result = await execute(() => chatApi.sendMessage(request));
    // 处理成功
  } catch (error) {
    // 处理错误
  }
};
```

#### useApiLoading

用于全局加载状态跟踪：

```typescript
import { useApiLoading } from '../hooks/useApiClient';

const loadingState = useApiLoading();

if (loadingState.isLoading) {
  return <div>加载中: {loadingState.operation}</div>;
}
```

#### useApiQueue

用于管理多个并发 API 调用：

```typescript
import { useApiQueue } from '../hooks/useApiClient';

const { executeWithQueue, queue, isAnyLoading } = useApiQueue();

const handleMultipleOperations = async () => {
  await executeWithQueue('op1', 'Operation 1', () => api.call1());
  await executeWithQueue('op2', 'Operation 2', () => api.call2());
};
```

#### useApiRetry

用于自定义逻辑的重试功能：

```typescript
import { useApiRetry } from '../hooks/useApiClient';

const { retry, retryCount, canRetry } = useApiRetry();

const handleRetryableOperation = async () => {
  await retry(() => api.unreliableCall(), (attempt) => {
    console.log(`重试第 ${attempt} 次`);
  });
};
```

#### useApiCache

用于缓存 API 响应：

```typescript
import { useApiCache } from '../hooks/useApiClient';

const { executeWithCache, get, set, clear } = useApiCache('cache-key', 300000); // 5 分钟 TTL

const getCachedData = async () => {
  return executeWithCache('data-key', () => api.getData());
};
```

#### useApiErrorHandler

用于一致的错误消息处理：

```typescript
import { useApiErrorHandler } from '../hooks/useApiClient';

const { handleError, getErrorMessage } = useApiErrorHandler();

// 将任何错误转换为用户友好的消息
const errorMessage = handleError(error);
```

## 错误处理

API 客户端提供全面的错误处理，包含特定的错误类型：

### 错误类型

- **ApiClientError**: API 相关错误的基础错误类
- **NetworkError**: 网络连接问题
- **TimeoutError**: 请求超时错误
- **ValidationError**: 输入验证错误

### 错误拦截器

您可以添加全局错误拦截器用于日志记录或自定义处理：

```typescript
import { apiClient } from './apiClient';

apiClient.addErrorInterceptor((error) => {
  // 将错误记录到监控服务
  console.error('API Error:', error);
  
  // 如需要可转换错误
  return error;
});
```

## 请求/响应拦截器

### 请求拦截器

添加自定义头部或身份验证：

```typescript
apiClient.addRequestInterceptor((config) => {
  return {
    ...config,
    headers: {
      ...config.headers,
      'Authorization': `Bearer ${getToken()}`,
      'X-Client-Version': '1.0.0',
    },
  };
});
```

### 响应拦截器

全局处理响应：

```typescript
apiClient.addResponseInterceptor((response) => {
  // 记录成功响应
  console.log('API Response:', response.status);
  
  return response;
});
```

## 配置

### 基于环境的 URL

API 客户端根据环境自动使用不同的基础 URL：

- **开发环境**: `http://localhost:3001/api`
- **生产环境**: `/api`

### 超时配置

默认超时为 30 秒，但可以按请求自定义：

```typescript
const data = await client.get('/endpoint', {
  timeout: 60000, // 60 秒
});
```

### 重试配置

重试行为可以自定义：

```typescript
const data = await client.get('/endpoint', {
  retries: 5,
  retryDelay: 2000, // 2 秒基础延迟
});
```

## 加载状态管理

API 客户端提供全局加载状态跟踪，可在整个应用程序中使用：

```typescript
import { useApiLoading } from '../hooks/useApiClient';

function GlobalLoadingIndicator() {
  const { isLoading, operation } = useApiLoading();
  
  if (!isLoading) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white p-2 text-center">
      {operation || '加载中...'}
    </div>
  );
}
```

## 类型安全

所有 API 调用都使用 TypeScript 接口进行完全类型化：

```typescript
// 请求/响应类型会自动推断
const response: ChatResponse = await chatApi.sendMessage(request);
const settings: Settings = await settingsApi.getSettings();
```

## 测试

API 客户端设计为易于使用模拟 fetch 进行测试：

```typescript
import { vi } from 'vitest';
import { ApiClient } from './apiClient';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const client = new ApiClient('http://test.com');

mockFetch.mockResolvedValueOnce({
  ok: true,
  json: () => Promise.resolve({ data: 'test' }),
});

const result = await client.get('/test');
expect(result).toEqual({ data: 'test' });
```

## 最佳实践

1. **使用预配置的 API 端点**（`chatApi`、`settingsApi` 等）而不是原始客户端
2. **使用 React hooks** 进行组件集成以获取加载状态和错误处理
3. **适当处理错误**，使用错误处理器 hook 获得一致的用户消息
4. **使用缓存**处理不经常变化的频繁访问数据
5. **添加请求拦截器**用于身份验证和通用头部
6. **监控加载状态**以提供良好的用户体验
7. **测试 API 调用**，在测试中模拟 fetch

## 使用示例

查看 `src/examples/ApiClientExample.tsx` 了解如何在 React 组件中使用所有 API 客户端功能的完整示例。