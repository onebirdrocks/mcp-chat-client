# MCP (Model Context Protocol) 功能说明

## 概述

本项目实现了 Model Context Protocol (MCP) 服务器管理功能，允许用户添加、配置和管理 MCP 服务器，从而扩展 AI 助手的功能。

## 功能特性

### 1. MCP 服务器管理
- ✅ 添加新的 MCP 服务器
- ✅ 编辑现有服务器配置
- ✅ 启用/禁用服务器
- ✅ 删除服务器
- ✅ 查看服务器状态和连接信息

### 2. 工具发现和显示
- ✅ 自动发现 MCP 服务器提供的工具
- ✅ 显示工具名称、描述和参数格式
- ✅ 展开/折叠工具详情
- ✅ 查看工具的输入/输出模式

### 3. 配置管理
- ✅ 支持命令行参数配置
- ✅ 支持环境变量配置（JSON 格式）
- ✅ 本地存储配置信息
- ✅ 自动保存和恢复配置

## 使用方法

### 1. 访问 MCP 设置页面
导航到 `/settings/mcp` 页面来管理 MCP 服务器。

### 2. 添加 MCP 服务器
1. 点击"添加服务器"按钮
2. 填写服务器信息：
   - **服务器名称**: 用于识别的友好名称
   - **描述**: 可选的服务器描述
   - **命令**: MCP 服务器的启动命令（如 `npx @modelcontextprotocol/server-github`）
   - **参数**: 命令行参数，用空格分隔
   - **环境变量**: JSON 格式的环境变量配置

### 3. 配置示例

#### GitHub MCP 服务器
```json
{
  "name": "GitHub MCP Server",
  "description": "访问 GitHub 仓库和代码",
  "command": "npx @modelcontextprotocol/server-github",
  "args": "--token YOUR_GITHUB_TOKEN",
  "env": "{\"GITHUB_TOKEN\": \"your_token_here\"}"
}
```

#### 文件系统 MCP 服务器
```json
{
  "name": "File System MCP Server",
  "description": "访问本地文件系统",
  "command": "npx @modelcontextprotocol/server-filesystem",
  "args": "--root /path/to/root",
  "env": "{}"
}
```

### 4. 管理服务器
- **启用/禁用**: 点击电源按钮来启用或禁用服务器
- **编辑**: 点击设置按钮来修改服务器配置
- **删除**: 点击删除按钮来移除服务器
- **查看工具**: 点击眼睛按钮来展开/折叠工具列表

## 与 AI SDK 集成

项目提供了与 AI SDK 集成的示例代码，位于 `src/lib/mcp-client.ts`。

### 基本集成步骤

1. **创建 MCP 工具提供者**:
```typescript
import { MCPToolProvider, MockMCPClient } from '@/lib/mcp-client';

const toolProvider = new MCPToolProvider();
```

2. **添加 MCP 客户端**:
```typescript
const client = new MockMCPClient();
await client.connect();
toolProvider.addClient('filesystem', client);
```

3. **获取工具定义**:
```typescript
const tools = await toolProvider.createAISDKTools();
```

4. **在 AI SDK 中使用**:
```typescript
import { openai } from '@ai-sdk/openai';

const result = await openai.chat({
  messages: [{ role: 'user', content: '搜索文件系统中的文件' }],
  tools: tools,
  toolChoice: 'auto',
});
```

## 技术实现

### 核心组件

1. **MCPServerManager** (`src/lib/mcp-manager.ts`)
   - 管理 MCP 服务器的生命周期
   - 处理连接和断开连接
   - 管理工具发现和执行

2. **MCPToolProvider** (`src/lib/mcp-client.ts`)
   - 为 AI SDK 提供工具接口
   - 管理多个 MCP 客户端
   - 处理工具调用路由

3. **UI 组件**
   - `MCPServerList`: 服务器列表显示
   - `AddMCPServerModal`: 添加服务器对话框
   - `EditMCPServerModal`: 编辑服务器对话框
   - `MCPServerTools`: 工具列表显示

### 数据存储

- 使用 `localStorage` 存储服务器配置
- 自动保存和恢复配置信息
- 支持配置的持久化

### API 路由

- `GET /api/mcp`: 获取所有服务器
- `POST /api/mcp`: 添加新服务器
- `PUT /api/mcp`: 更新服务器配置
- `DELETE /api/mcp`: 删除服务器
- `POST /api/mcp/toggle`: 切换服务器状态

## 扩展开发

### 添加新的 MCP 客户端

1. 实现 `MCPClient` 接口:
```typescript
export class CustomMCPClient implements MCPClient {
  async connect(): Promise<void> { /* 实现连接逻辑 */ }
  async disconnect(): Promise<void> { /* 实现断开逻辑 */ }
  async listTools(): Promise<MCPTool[]> { /* 实现工具发现 */ }
  async callTool(toolName: string, arguments_: any): Promise<any> { /* 实现工具调用 */ }
}
```

2. 在 `MCPToolProvider` 中注册客户端:
```typescript
toolProvider.addClient('custom', new CustomMCPClient());
```

### 自定义工具处理

在 `MCPToolProvider.executeTool` 方法中添加自定义的工具处理逻辑。

## 注意事项

1. **安全性**: 确保环境变量中的敏感信息（如 API 密钥）得到适当保护
2. **错误处理**: 所有 MCP 操作都包含适当的错误处理
3. **性能**: 连接和断开操作是异步的，避免阻塞 UI
4. **兼容性**: 当前实现使用模拟客户端，实际使用时需要替换为真实的 MCP 客户端

## 未来改进

- [ ] 支持真实的 MCP 客户端连接
- [ ] 添加服务器健康检查
- [ ] 支持服务器配置模板
- [ ] 添加工具使用统计
- [ ] 支持批量操作
- [ ] 添加配置导入/导出功能
