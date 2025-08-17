# MCP REST API 架构

## 架构原则

所有 MCP 相关操作都在服务器端使用 AI-SDK，前端只通过 REST API 调用后端。

## 架构图

```
┌─────────────────┐    REST API    ┌─────────────────┐    AI-SDK    ┌─────────────────┐
│   前端组件      │ ──────────────→ │   服务器端      │ ────────────→ │   MCP 服务器    │
│                 │                 │                 │               │                 │
│ - React 组件    │ ←────────────── │ - API 路由      │ ←──────────── │ - ebook-mcp     │
│ - 状态管理      │                 │ - 服务器管理器  │               │ - Playwright    │
│ - UI 交互       │                 │ - 配置管理      │               │ - 其他 MCP      │
└─────────────────┘                 └─────────────────┘               └─────────────────┘
```

## 服务器端组件

### 1. 服务器端管理器 (`mcp-manager-server.ts`)

**职责**:
- 管理 MCP 服务器连接
- 工具发现和注册
- 工具执行
- 配置文件管理

**特点**:
- 使用 AI-SDK 的 MCP 功能
- 从 `.mcp-servers.json` 读取配置
- 持久化保存服务器状态

### 2. API 路由

#### `/api/mcp/servers` - 服务器管理
- `GET` - 获取所有服务器
- `POST` - 添加服务器
- `PUT` - 更新服务器
- `DELETE` - 删除服务器

#### `/api/mcp/toggle` - 服务器切换
- `POST` - 启用/禁用服务器

#### `/api/mcp/tools` - 工具管理
- `GET` - 获取所有启用的工具

#### `/api/mcp/execute-tools` - 工具执行
- `POST` - 执行工具调用

#### `/api/mcp/health/[id]` - 健康检查
- `GET` - 检查服务器健康状态

#### `/api/mcp/reload-config` - 配置重载
- `POST` - 重新加载配置文件

#### `/api/ai/tool-call-simplified` - AI 工具调用
- `POST` - 处理 AI 模型的工具调用

## 前端组件

### 前端管理器 (`mcp-manager-frontend.ts`)

**职责**:
- 通过 REST API 与服务器通信
- 提供统一的接口给前端组件

**特点**:
- 纯前端代码，无 Node.js 依赖
- 所有操作都通过 fetch API 调用后端
- 错误处理和状态管理

## 配置文件格式

使用现有的 `.mcp-servers.json` 格式：

```json
{
  "mcpServers": {
    "ebook-mcp": {
      "command": "uv",
      "args": ["--directory", "/path/to/ebook-mcp", "run", "main.py"],
      "env": {}
    },
    "Playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "env": {}
    }
  }
}
```

服务器端管理器会自动将这种格式转换为内部使用的服务器对象格式，包含 `id`、`enabled`、`tools`、`status` 等字段。

## 数据流示例

### 1. 获取服务器列表
```
前端 → GET /api/mcp/servers → 服务器端管理器 → .mcp-servers.json → 返回服务器列表
```

### 2. 启用服务器
```
前端 → POST /api/mcp/toggle → 服务器端管理器 → AI-SDK → MCP 服务器 → 返回工具列表
```

### 3. 执行工具
```
前端 → POST /api/mcp/execute-tools → 服务器端管理器 → AI-SDK → MCP 服务器 → 返回结果
```

### 4. AI 工具调用
```
前端 → POST /api/ai/tool-call-simplified → AI-SDK → 服务器端管理器 → MCP 服务器 → 返回 AI 响应
```

## API 接口规范

### 服务器管理

#### 获取所有服务器
```http
GET /api/mcp/servers
```

响应:
```json
{
  "success": true,
  "servers": [
    {
      "id": "server-id",
      "name": "ebook-mcp",
      "command": "uv",
      "args": ["..."],
      "env": {},
      "enabled": true,
      "tools": [],
      "status": "connected",
      "lastConnected": "2024-01-01T00:00:00Z"
    }
  ],
  "configPath": "/path/to/.mcp-servers.json"
}
```

#### 添加服务器
```http
POST /api/mcp/servers
Content-Type: application/json

{
  "name": "new-server",
  "command": "python",
  "args": ["script.py"],
  "env": {}
}
```

#### 切换服务器状态
```http
POST /api/mcp/toggle
Content-Type: application/json

{
  "serverId": "server-id",
  "enabled": true
}
```

### 工具管理

#### 获取工具列表
```http
GET /api/mcp/tools
```

响应:
```json
{
  "success": true,
  "tools": {
    "ebook-mcp_get_all_epub_files": {
      "description": "Get all epub files in a given path",
      "inputSchema": {...},
      "outputSchema": {...}
    }
  }
}
```

#### 执行工具
```http
POST /api/mcp/execute-tools
Content-Type: application/json

{
  "toolCalls": [
    {
      "name": "ebook-mcp_get_all_epub_files",
      "arguments": {
        "path": "/path/to/books"
      }
    }
  ]
}
```

## 优势

### 1. **清晰的职责分离**
- 前端：UI 和用户交互
- 后端：MCP 协议处理和 AI-SDK 集成

### 2. **环境兼容性**
- 前端代码可在浏览器中运行
- 后端代码可访问 Node.js API

### 3. **可扩展性**
- 易于添加新的 API 端点
- 支持不同的前端框架

### 4. **可维护性**
- 统一的错误处理
- 清晰的 API 接口
- 易于调试和测试

### 5. **配置管理**
- 使用现有 `.mcp-servers.json` 格式
- 自动转换为内部格式
- 持久化配置存储

## 使用示例

### 前端使用
```typescript
import { frontendMCPServerManager } from '@/lib/mcp-manager-frontend';

// 获取所有服务器
const servers = await frontendMCPServerManager.getAllServers();

// 启用服务器
await frontendMCPServerManager.toggleServer(serverId, true);

// 获取工具
const tools = await frontendMCPServerManager.getAllEnabledTools();

// 执行工具
const result = await frontendMCPServerManager.executeTool('tool-name', { arg: 'value' });
```

### 后端使用
```typescript
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

// 在 API 路由中
const servers = serverMCPServerManager.getAllServers();
const tools = serverMCPServerManager.getAllEnabledTools();
const result = await serverMCPServerManager.executeTool(toolName, arguments);
```

## 总结

这种基于 REST API 的架构确保了：

- ✅ 所有 MCP 操作都在服务器端
- ✅ 前端只通过 API 调用后端
- ✅ 使用 AI-SDK 进行 MCP 集成
- ✅ 使用现有 `.mcp-servers.json` 格式
- ✅ 清晰的职责分离
- ✅ 良好的可维护性和扩展性
