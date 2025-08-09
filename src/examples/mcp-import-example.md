# MCP 服务器配置导入示例

## 支持的 JSON 格式

### 1. 标准 MCP 配置格式

```json
{
  "mcpServers": {
    "ebook-mcp": {
      "command": "uv",
      "args": [
        "--directory",
        "/Users/onebird/github/ebook-mcp/src/ebook_mcp/",
        "run",
        "main.py"
      ],
      "env": {
        "FASTMCP_LOG_LEVEL": "ERROR"
      },
      "enabled": true
    },
    "filesystem-mcp": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/directory"
      ],
      "enabled": true
    }
  }
}
```

### 2. 数组格式

```json
[
  {
    "name": "ebook-mcp",
    "command": "uv",
    "args": [
      "--directory",
      "/Users/onebird/github/ebook-mcp/src/ebook_mcp/",
      "run",
      "main.py"
    ],
    "env": {
      "FASTMCP_LOG_LEVEL": "ERROR"
    },
    "enabled": true
  },
  {
    "name": "filesystem-mcp",
    "command": "npx",
    "args": [
      "@modelcontextprotocol/server-filesystem",
      "/path/to/allowed/directory"
    ],
    "enabled": true
  }
]
```

## 使用方法

### 在代码中使用

```typescript
import { useSettings } from '../hooks/useSettings';

const MyComponent = () => {
  const { importMCPServers } = useSettings();

  const handleImportMCP = async () => {
    const mcpConfig = `{
      "mcpServers": {
        "ebook-mcp": {
          "command": "uv",
          "args": ["--directory", "/path/to/ebook-mcp", "run", "main.py"]
        }
      }
    }`;

    const success = await importMCPServers(mcpConfig);
    if (success) {
      console.log('MCP servers imported successfully!');
    } else {
      console.error('Failed to import MCP servers');
    }
  };

  return (
    <button onClick={handleImportMCP}>
      Import MCP Servers
    </button>
  );
};
```

### 直接使用存储

```typescript
import { useSettingsStore, importMCPServersFromJSON } from '../store/settingsStore';

// 解析 MCP 配置
const servers = importMCPServersFromJSON(mcpConfigJson);

// 批量导入
const store = useSettingsStore.getState();
await store.importMCPServers(mcpConfigJson);
```

## 字段说明

- `command`: 启动 MCP 服务器的命令
- `args`: 命令行参数数组
- `env`: 环境变量对象（可选）
- `enabled`: 是否启用该服务器（默认为 true）

导入后，每个服务器会自动分配一个唯一的 ID，状态设置为 'disconnected'。