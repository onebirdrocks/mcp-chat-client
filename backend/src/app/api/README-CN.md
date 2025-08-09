# API 端点文档

本文档描述了为 MCP Chat UI 后端实现的 API 端点。

## 设置端点

### GET/POST/PUT /api/settings

管理应用程序设置，包括 LLM 提供商配置、MCP 服务器配置和用户偏好设置。

**GET /api/settings**
- 返回当前设置配置
- 响应：包含 `llmProviders`、`mcpServers` 和 `preferences` 的 `Settings` 对象

**POST /api/settings**
- 创建或更新设置配置
- 请求体：部分 `Settings` 对象
- 响应：更新后的 `Settings` 对象

**PUT /api/settings**
- 更新设置配置（与 POST 相同）
- 请求体：部分 `Settings` 对象
- 响应：更新后的 `Settings` 对象

**示例响应：**
```json
{
  "llmProviders": [
    {
      "id": "openai-1",
      "name": "openai",
      "apiKey": "",
      "baseUrl": "https://api.openai.com/v1",
      "models": [
        {
          "id": "gpt-4",
          "name": "GPT-4",
          "supportsToolCalling": true,
          "maxTokens": 8192
        }
      ]
    }
  ],
  "mcpServers": [
    {
      "id": "filesystem-1",
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "enabled": false,
      "status": "disconnected"
    }
  ],
  "preferences": {
    "theme": "system",
    "language": "en",
    "autoScroll": true,
    "soundEnabled": false
  }
}
```

## 聊天历史端点

### GET /api/chat-history

检索聊天会话历史，支持可选的过滤和分页。

**查询参数：**
- `limit`（可选）：返回的会话数量（1-100，默认：50）
- `offset`（可选）：跳过的会话数量（默认：0）
- `query`（可选）：会话标题/内容的搜索查询
- `provider`（可选）：按 LLM 提供商过滤
- `sortBy`（可选）：排序字段（'createdAt'、'updatedAt'、'title'，默认：'updatedAt'）
- `sortOrder`（可选）：排序顺序（'asc'、'desc'，默认：'desc'）

**响应：**
```json
{
  "sessions": [
    {
      "id": "session-1",
      "title": "测试会话",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "messageCount": 5,
      "provider": "openai",
      "model": "gpt-4"
    }
  ],
  "total": 1,
  "hasMore": false
}
```

### DELETE /api/chat-history

删除聊天会话。

**查询参数：**
- `sessionId`（必需）：要删除的会话 ID

**响应：**
```json
{
  "success": true
}
```

### PUT /api/chat-history

更新聊天会话（例如，重命名）。

**查询参数：**
- `sessionId`（必需）：要更新的会话 ID

**请求体：**
```json
{
  "title": "新会话标题"
}
```

**响应：**
```json
{
  "id": "session-1",
  "title": "新会话标题",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## 单个会话端点

### GET /api/chat-history/[sessionId]

检索包含所有消息的完整聊天会话。

**响应：**
```json
{
  "id": "session-1",
  "title": "测试会话",
  "messages": [],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "provider": "openai",
  "model": "gpt-4",
  "mcpServers": []
}
```

### PUT /api/chat-history/[sessionId]

更新特定的聊天会话。

**请求体：**
```json
{
  "title": "更新的标题",
  "messages": [] // 可选：更新消息
}
```

### DELETE /api/chat-history/[sessionId]

删除特定的聊天会话。

**响应：**
```json
{
  "success": true
}
```

## 错误处理

所有端点使用一致的错误处理：

- **400 Bad Request**：验证错误、无效参数
- **404 Not Found**：会话未找到
- **500 Internal Server Error**：服务器错误

**错误响应格式：**
```json
{
  "error": "ValidationError",
  "message": "详细错误消息",
  "statusCode": 400
}
```

## CORS 支持

所有端点都包含用于本地开发的 CORS 头：
- 允许的来源：`http://localhost:5173`、`http://localhost:3000`、`http://localhost:4173`
- 允许的方法：`GET`、`POST`、`PUT`、`DELETE`、`OPTIONS`
- 支持凭据：`true`

## 满足的需求

此实现满足以下需求：

- **2.2**：API 凭据存储 - 设置端点管理 LLM 提供商配置和安全的 API 密钥存储
- **7.2**：加密存储 - API 密钥安全存储在本地浏览器存储中（前端责任）
- **9.2**：显示对话列表 - GET /api/chat-history 返回分页的会话列表
- **9.3**：加载完整对话 - GET /api/chat-history/[sessionId] 返回包含消息的完整会话
- **9.4**：重命名、删除、归档对话 - PUT 和 DELETE 端点支持会话管理操作