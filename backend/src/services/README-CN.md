# 会话管理服务

本文档描述了 SessionManager 服务及其用于在 MCP Chat UI 后端管理聊天会话的 API 端点。

## SessionManager 功能

SessionManager 提供全面的会话管理功能：

- **会话存储**：基于文件存储的聊天会话持久化存储
- **会话检索**：获取单个会话或搜索/过滤多个会话
- **会话清理**：基于时间和数量限制自动清理旧会话
- **会话搜索**：按标题或消息内容搜索会话，按提供商过滤
- **自动标题生成**：使用 LLM 服务生成会话标题
- **会话统计**：获取使用统计和提供商分布

## API 端点

### 会话管理

#### 创建新会话
```http
POST /api/sessions
Content-Type: application/json

{
  "provider": "openai",
  "model": "gpt-4",
  "mcpServers": ["server1", "server2"],
  "initialMessage": {
    "id": "msg-1",
    "role": "user",
    "content": "Hello",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 获取会话
```http
GET /api/chat-history/{sessionId}
```

#### 更新会话
```http
PUT /api/chat-history/{sessionId}
Content-Type: application/json

{
  "title": "Updated Session Title",
  "messages": [...]
}
```

#### 删除会话
```http
DELETE /api/chat-history/{sessionId}
```

### 会话搜索和过滤

#### 搜索会话
```http
GET /api/chat-history?query=search&provider=openai&limit=20&offset=0&sortBy=updatedAt&sortOrder=desc
```

查询参数：
- `query`：标题或消息内容的搜索词
- `provider`：按 LLM 提供商过滤（openai、deepseek、openrouter）
- `limit`：结果数量（1-100，默认：50）
- `offset`：分页偏移量（默认：0）
- `sortBy`：排序字段（createdAt、updatedAt、title，默认：updatedAt）
- `sortOrder`：排序顺序（asc、desc，默认：desc）

### 消息管理

#### 向会话添加消息
```http
POST /api/sessions/{sessionId}/messages
Content-Type: application/json

{
  "message": {
    "id": "msg-1",
    "role": "user",
    "content": "Hello",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 标题生成

#### 生成会话标题
```http
POST /api/chat-history/{sessionId}/generate-title
Content-Type: application/json

{
  "provider": "openai",
  "model": "gpt-4",
  "apiKey": "your-api-key",
  "baseUrl": "https://api.openai.com/v1"
}
```

### 统计和维护

#### 获取会话统计
```http
GET /api/sessions/stats
```

响应：
```json
{
  "totalSessions": 150,
  "lastCleanup": "2024-01-01T00:00:00.000Z",
  "providerBreakdown": {
    "openai": 80,
    "deepseek": 50,
    "openrouter": 20
  },
  "averageMessagesPerSession": 12.5
}
```

#### 触发会话清理
```http
POST /api/sessions/stats
```

响应：
```json
{
  "success": true,
  "deletedCount": 5,
  "message": "Cleaned up 5 old sessions"
}
```

## 配置

SessionManager 可以使用以下参数进行配置：

- `storageDir`：会话存储目录（默认：'./data/sessions'）
- `maxSessions`：保留的最大会话数（默认：1000）
- `cleanupIntervalMs`：自动清理间隔（毫秒）（默认：24小时）

## 存储格式

会话以 JSON 格式存储，具有以下结构：

```json
{
  "sessions": {
    "session_id": {
      "id": "session_id",
      "title": "Session Title",
      "messages": [...],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "provider": "openai",
      "model": "gpt-4",
      "mcpServers": ["server1"]
    }
  },
  "metadata": {
    "lastCleanup": "2024-01-01T00:00:00.000Z",
    "totalSessions": 1
  }
}
```

## 错误处理

该服务使用结构化错误处理，包含以下错误类型：

- `ValidationError`（400）：无效的请求参数
- `NotFoundError`（404）：会话未找到
- `InternalServerError`（500）：存储或处理错误

## 测试

运行测试套件：

```bash
npm run test:run
```

测试覆盖：
- 会话创建、检索、更新和删除
- 会话搜索和过滤
- 标题生成（LLM 和回退）
- 会话统计
- 错误处理场景