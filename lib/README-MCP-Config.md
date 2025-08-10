# MCP Configuration System

This module provides a robust configuration management system for Model Context Protocol (MCP) servers, compatible with Cursor's `mcpServers` format.

## Features

- ✅ **Cursor-Compatible Format**: Uses the same JSON structure as Cursor's MCP configuration
- ✅ **Zod Schema Validation**: Type-safe configuration with runtime validation
- ✅ **Hot Reload**: Automatic configuration reloading when files change
- ✅ **Server Management**: Enable/disable servers, manage timeouts and concurrency
- ✅ **TypeScript Support**: Full TypeScript types and IntelliSense support
- ✅ **Error Handling**: Comprehensive error handling with detailed messages
- ✅ **Singleton Pattern**: Thread-safe singleton configuration manager

## Configuration Format

The configuration file (`config/mcp.config.json`) follows this structure:

```json
{
  "mcpServers": {
    "server-id": {
      "command": "command-to-run",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      },
      "disabled": false,
      "timeout": 30000,
      "maxConcurrency": 5
    }
  }
}
```

### Configuration Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `command` | string | ✅ | - | Command to execute the MCP server |
| `args` | string[] | ❌ | `[]` | Command line arguments |
| `env` | object | ❌ | `{}` | Environment variables |
| `disabled` | boolean | ❌ | `false` | Whether the server is disabled |
| `timeout` | number | ❌ | `30000` | Timeout in milliseconds |
| `maxConcurrency` | number | ❌ | `5` | Maximum concurrent operations |

## Usage

### Basic Usage

```typescript
import { initializeMCPConfig, getEnabledMCPServers } from './lib/mcp-utils';

// Initialize the configuration system
const config = await initializeMCPConfig();

// Get all enabled servers
const enabledServers = await getEnabledMCPServers();
console.log('Enabled servers:', Object.keys(enabledServers));
```

### Server Management

```typescript
import { 
  getMCPServerConfig, 
  isMCPServerEnabled,
  getMCPServerCommand 
} from './lib/mcp-utils';

// Check if a server is enabled
const isEnabled = await isMCPServerEnabled('my-server');

// Get server configuration
const config = await getMCPServerConfig('my-server');

// Get command details for spawning
const command = await getMCPServerCommand('my-server');
if (command) {
  console.log(`Command: ${command.command}`);
  console.log(`Args: ${command.args.join(' ')}`);
  console.log(`Env:`, command.env);
}
```

### Configuration Watching

```typescript
import { onMCPConfigChange, offMCPConfigChange } from './lib/mcp-utils';

// Set up a watcher for configuration changes
const handleConfigChange = () => {
  console.log('Configuration changed!');
  // Reload your MCP clients here
};

onMCPConfigChange(handleConfigChange);

// Remove the watcher when no longer needed
offMCPConfigChange(handleConfigChange);
```

### Validation

```typescript
import { validateMCPConfig } from './lib/mcp-utils';

try {
  const validConfig = validateMCPConfig(userProvidedConfig);
  console.log('Configuration is valid!');
} catch (error) {
  console.error('Invalid configuration:', error.message);
}
```

## API Reference

### Core Functions

#### `initializeMCPConfig(): Promise<MCPConfig>`
Initializes the MCP configuration system. Creates default config if needed, loads configuration, and starts file watching.

#### `getAllMCPServers(): Promise<Record<string, MCPServerConfig>>`
Returns all configured MCP servers (including disabled ones).

#### `getEnabledMCPServers(): Promise<Record<string, MCPServerConfig>>`
Returns only enabled MCP servers.

#### `getMCPServerConfig(serverId: string): Promise<MCPServerConfig | null>`
Gets configuration for a specific server.

#### `isMCPServerEnabled(serverId: string): Promise<boolean>`
Checks if a specific server is enabled.

#### `getMCPServerCommand(serverId: string): Promise<{command: string, args: string[], env: Record<string, string>} | null>`
Gets command details for spawning a server process.

### Configuration Management

#### `validateMCPConfig(config: unknown): MCPConfig`
Validates a configuration object using Zod schemas.

#### `reloadMCPConfig(): Promise<MCPConfig>`
Manually reloads configuration from file.

#### `saveMCPConfig(config: MCPConfig): Promise<void>`
Saves configuration to file with validation.

#### `mcpConfigExists(): Promise<boolean>`
Checks if configuration file exists.

#### `createDefaultMCPConfig(): Promise<void>`
Creates a default configuration file.

### Event Handling

#### `onMCPConfigChange(callback: () => void): void`
Adds a callback for configuration changes.

#### `offMCPConfigChange(callback: () => void): void`
Removes a configuration change callback.

## Example Configuration

```json
{
  "mcpServers": {
    "ebook-mcp": {
      "command": "uv",
      "args": ["--directory", "/path/to/ebook-mcp/src/ebook_mcp/", "run", "main.py"],
      "env": {
        "PYTHONPATH": "/path/to/ebook-mcp/src"
      }
    },
    "weather": {
      "command": "uvx",
      "args": ["--directory", "/path/to/weather", "run", "weather.py"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "timeout": 60000,
      "maxConcurrency": 10
    },
    "disabled-server": {
      "command": "echo",
      "args": ["disabled"],
      "disabled": true
    }
  }
}
```

## Error Handling

The system provides comprehensive error handling:

- **Validation Errors**: Detailed Zod validation errors with field paths
- **File Errors**: Clear messages for missing or unreadable files
- **JSON Errors**: Helpful parsing error messages
- **Runtime Errors**: Graceful handling of configuration issues

```typescript
try {
  await initializeMCPConfig();
} catch (error) {
  if (error.message.includes('Invalid MCP configuration')) {
    console.error('Configuration validation failed:', error.message);
  } else if (error.message.includes('not found')) {
    console.error('Configuration file missing:', error.message);
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## Testing

Run the test suite:

```bash
npm test lib/__tests__/mcp-config.test.ts
```

Run the example demo:

```bash
npx tsx lib/examples/mcp-config-example.ts
```

## Integration with Next.js

For Next.js applications, initialize the configuration system in your startup code:

```typescript
// In your API route or middleware
import { initializeMCPConfig } from './lib/mcp-utils';

// Initialize during application startup
let configInitialized = false;

export async function ensureMCPConfigInitialized() {
  if (!configInitialized) {
    await initializeMCPConfig();
    configInitialized = true;
  }
}
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **3.1**: Configuration-driven MCP server management with JSON format
- **3.2**: Server configuration validation and error handling
- **3.6**: Hot-reload functionality for configuration changes

The system is production-ready and provides a solid foundation for MCP server integration in the chat application.