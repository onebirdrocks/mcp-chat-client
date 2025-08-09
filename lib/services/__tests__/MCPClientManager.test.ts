import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { MCPClientManager, getMCPClientManager, initializeMCPClientManager } from '../MCPClientManager';
import { MCPServerConfig } from '../../types';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => ({
    // Mock transport methods
  })),
}));

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    close: vi.fn(),
    listTools: vi.fn(),
    callTool: vi.fn(),
  })),
}));

// Mock the config manager
vi.mock('../../mcp-config', () => ({
  mcpConfigManager: {
    getConfig: vi.fn(),
    addWatcher: vi.fn(),
  },
}));

describe('MCPClientManager', () => {
  let manager: MCPClientManager;
  let mockConfig: MCPServerConfig[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = [
      {
        id: 'test-server',
        name: 'Test Server',
        command: 'node',
        args: ['test-server.js'],
        env: { TEST_ENV: 'true' },
        enabled: true,
        timeout: 30000,
        maxConcurrency: 5,
      },
      {
        id: 'disabled-server',
        name: 'Disabled Server',
        command: 'node',
        args: ['disabled-server.js'],
        env: {},
        enabled: false,
        timeout: 30000,
        maxConcurrency: 5,
      },
    ];

    manager = new MCPClientManager({
      maxReconnectAttempts: 3,
      reconnectDelay: 1000,
      connectionTimeout: 5000,
      healthCheckInterval: 10000,
      toolCacheTimeout: 30000,
    });
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('constructor', () => {
    it('should create manager with default options', () => {
      const defaultManager = new MCPClientManager();
      expect(defaultManager).toBeInstanceOf(MCPClientManager);
    });

    it('should create manager with custom options', () => {
      const customManager = new MCPClientManager({
        maxReconnectAttempts: 10,
        reconnectDelay: 2000,
      });
      expect(customManager).toBeInstanceOf(MCPClientManager);
    });
  });

  describe('connectServer', () => {
    it('should skip connection for disabled servers', async () => {
      const disabledConfig = mockConfig.find(c => !c.enabled)!;
      
      await manager.connectServer(disabledConfig);
      
      const statuses = manager.getConnectionStatuses();
      expect(statuses[disabledConfig.id]).toBeUndefined();
    });

    it('should not reconnect if already connected', async () => {
      const config = mockConfig[0];
      
      // Mock the Client constructor to return a mock instance
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const mockConnect = vi.fn().mockResolvedValue(undefined);
      const mockListTools = vi.fn().mockResolvedValue({
        tools: [
          {
            name: 'test_tool',
            description: 'A test tool',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      });
      
      (Client as any).mockImplementation(() => ({
        connect: mockConnect,
        listTools: mockListTools,
        close: vi.fn(),
        callTool: vi.fn(),
      }));

      await manager.connectServer(config);
      
      // Try to connect again
      await manager.connectServer(config);
      
      // Should only connect once (first connection should be reused)
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors gracefully', async () => {
      const config = mockConfig[0];
      
      // Mock connection failure
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const mockConnect = vi.fn().mockRejectedValue(new Error('Connection failed'));
      
      (Client as any).mockImplementation(() => ({
        connect: mockConnect,
        listTools: vi.fn(),
        close: vi.fn(),
        callTool: vi.fn(),
      }));

      await manager.connectServer(config);
      
      const statuses = manager.getConnectionStatuses();
      expect(statuses[config.id].status).toBe('unhealthy');
      expect(statuses[config.id].error).toBe('Connection failed');
    });

    it('should handle connection timeout', async () => {
      const config = mockConfig[0];
      
      // Mock connection that never resolves
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const mockConnect = vi.fn().mockImplementation(() => new Promise(() => {}));
      
      (Client as any).mockImplementation(() => ({
        connect: mockConnect,
        listTools: vi.fn(),
        close: vi.fn(),
        callTool: vi.fn(),
      }));

      const shortTimeoutManager = new MCPClientManager({
        connectionTimeout: 100, // Very short timeout
      });

      await shortTimeoutManager.connectServer(config);
      
      const statuses = shortTimeoutManager.getConnectionStatuses();
      expect(statuses[config.id].status).toBe('unhealthy');
      expect(statuses[config.id].error).toContain('timeout');
      
      await shortTimeoutManager.shutdown();
    });
  });

  describe('disconnectServer', () => {
    it('should handle disconnection of non-existent server', async () => {
      await expect(manager.disconnectServer('non-existent')).resolves.not.toThrow();
    });

    it('should properly disconnect connected server', async () => {
      const config = mockConfig[0];
      
      // Mock successful connection
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const mockConnect = vi.fn().mockResolvedValue(undefined);
      const mockClose = vi.fn().mockResolvedValue(undefined);
      const mockListTools = vi.fn().mockResolvedValue({ tools: [] });
      
      (Client as any).mockImplementation(() => ({
        connect: mockConnect,
        close: mockClose,
        listTools: mockListTools,
        callTool: vi.fn(),
      }));

      await manager.connectServer(config);
      await manager.disconnectServer(config.id);
      
      expect(mockClose).toHaveBeenCalled();
      
      const statuses = manager.getConnectionStatuses();
      expect(statuses[config.id].status).toBe('unhealthy');
    });
  });

  describe('tool discovery and execution', () => {
    let mockConnect: Mock;
    let mockListTools: Mock;
    let mockCallTool: Mock;
    let mockClose: Mock;

    beforeEach(async () => {
      const config = mockConfig[0];
      
      // Mock successful connection with tools
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      
      mockConnect = vi.fn().mockResolvedValue(undefined);
      mockListTools = vi.fn().mockResolvedValue({
        tools: [
          {
            name: 'test_tool',
            description: 'A test tool',
            inputSchema: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
              required: ['message'],
            },
          },
          {
            name: 'dangerous_tool',
            description: 'A tool that deletes files',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      });
      mockCallTool = vi.fn();
      mockClose = vi.fn();
      
      (Client as any).mockImplementation(() => ({
        connect: mockConnect,
        listTools: mockListTools,
        callTool: mockCallTool,
        close: mockClose,
      }));

      await manager.connectServer(config);
    });

    it('should discover tools with serverId prefixes', () => {
      const tools = manager.getAllTools();
      
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('test-server.test_tool');
      expect(tools[0].serverId).toBe('test-server');
      expect(tools[0].requiresConfirmation).toBe(true);
      
      expect(tools[1].name).toBe('test-server.dangerous_tool');
      expect(tools[1].dangerous).toBe(true);
    });

    it('should get tools from specific server', () => {
      const tools = manager.getServerTools('test-server');
      
      expect(tools).toHaveLength(2);
      expect(tools.every(t => t.serverId === 'test-server')).toBe(true);
    });

    it('should return empty array for non-existent server', () => {
      const tools = manager.getServerTools('non-existent');
      expect(tools).toHaveLength(0);
    });

    it('should execute tool successfully', async () => {
      mockCallTool.mockResolvedValue({
        content: [{ type: 'text', text: 'Tool executed successfully' }],
      });

      const result = await manager.executeTool('test-server.test_tool', {
        message: 'Hello, world!',
      });

      expect(result.success).toBe(true);
      expect(result.serverId).toBe('test-server');
      expect(result.toolName).toBe('test_tool');
      expect(result.result).toBeDefined();
      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'test_tool',
        arguments: { message: 'Hello, world!' },
      });
    });

    it('should handle invalid tool name format', async () => {
      const result = await manager.executeTool('invalid-tool-name', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid tool name format');
    });

    it('should handle tool execution on non-existent server', async () => {
      const result = await manager.executeTool('non-existent.tool', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Server "non-existent" not found');
    });

    it('should handle tool execution timeout', async () => {
      mockCallTool.mockImplementation(() => new Promise(() => {}));

      // Create a manager with very short timeout for testing
      const timeoutManager = new MCPClientManager({
        maxReconnectAttempts: 3,
        reconnectDelay: 1000,
        connectionTimeout: 5000,
        healthCheckInterval: 10000,
        toolCacheTimeout: 30000,
      });

      // Connect with short timeout config
      const config = {
        ...mockConfig[0],
        timeout: 100, // Very short timeout
      };

      await timeoutManager.connectServer(config);

      const result = await timeoutManager.executeTool('test-server.test_tool', {
        message: 'Hello, world!',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      
      await timeoutManager.shutdown();
    }, 10000);

    it('should handle tool execution errors', async () => {
      mockCallTool.mockRejectedValue(new Error('Tool execution failed'));

      const result = await manager.executeTool('test-server.test_tool', {
        message: 'Hello, world!',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tool execution failed');
    });
  });

  describe('configuration management', () => {
    it('should update server configurations', async () => {
      const newConfigs = [
        {
          ...mockConfig[0],
          command: 'python', // Changed command
        },
        {
          id: 'new-server',
          name: 'New Server',
          command: 'node',
          args: ['new-server.js'],
          env: {},
          enabled: true,
          timeout: 30000,
          maxConcurrency: 5,
        },
      ];

      await manager.updateServerConfigs(newConfigs);
      
      const statuses = manager.getConnectionStatuses();
      expect(Object.keys(statuses)).toContain('new-server');
    });

    it('should remove servers not in new configuration', async () => {
      // First add a server
      await manager.updateServerConfigs([mockConfig[0]]);
      
      // Then update with empty config
      await manager.updateServerConfigs([]);
      
      const statuses = manager.getConnectionStatuses();
      expect(Object.keys(statuses)).toHaveLength(0);
    });
  });

  describe('health monitoring', () => {
    it('should perform health checks', async () => {
      const config = mockConfig[0];
      
      // Mock successful connection
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const mockConnect = vi.fn().mockResolvedValue(undefined);
      const mockListTools = vi.fn().mockResolvedValue({ tools: [] });
      
      (Client as any).mockImplementation(() => ({
        connect: mockConnect,
        listTools: mockListTools,
        close: vi.fn(),
        callTool: vi.fn(),
      }));

      await manager.connectServer(config);
      await manager.performHealthCheck();
      
      // Health check should call listTools again
      expect(mockListTools).toHaveBeenCalledTimes(2); // Once for connection, once for health check
    });

    it('should handle health check failures', async () => {
      const config = mockConfig[0];
      
      // Mock connection that fails health check with a connection error
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const mockConnect = vi.fn().mockResolvedValue(undefined);
      const mockListTools = vi.fn()
        .mockResolvedValueOnce({ tools: [] }) // Initial connection
        .mockRejectedValueOnce(new Error('Connection closed')); // Health check failure with connection error
      
      (Client as any).mockImplementation(() => ({
        connect: mockConnect,
        listTools: mockListTools,
        close: vi.fn(),
        callTool: vi.fn(),
      }));

      await manager.connectServer(config);
      
      // Verify connection is initially healthy
      let statuses = manager.getConnectionStatuses();
      expect(statuses[config.id].status).toBe('healthy');
      
      // Perform health check that should fail
      await manager.performHealthCheck();
      
      // Now it should be unhealthy (connection status changed to 'error')
      statuses = manager.getConnectionStatuses();
      expect(statuses[config.id].status).toBe('unhealthy');
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance from getMCPClientManager', () => {
      const instance1 = getMCPClientManager();
      const instance2 = getMCPClientManager();
      
      expect(instance1).toBe(instance2);
    });

    it('should initialize manager with configuration', async () => {
      const { mcpConfigManager } = await import('../../mcp-config');
      (mcpConfigManager.getConfig as Mock).mockResolvedValue({
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['test.js'],
            env: {},
            disabled: false,
            timeout: 30000,
            maxConcurrency: 5,
          },
        },
      });

      const manager = await initializeMCPClientManager();
      
      expect(manager).toBeInstanceOf(MCPClientManager);
      expect(mcpConfigManager.getConfig).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      const config = mockConfig[0];
      
      // Mock successful connection
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const mockConnect = vi.fn().mockResolvedValue(undefined);
      const mockClose = vi.fn().mockResolvedValue(undefined);
      const mockListTools = vi.fn().mockResolvedValue({ tools: [] });
      
      (Client as any).mockImplementation(() => ({
        connect: mockConnect,
        close: mockClose,
        listTools: mockListTools,
        callTool: vi.fn(),
      }));

      await manager.connectServer(config);
      await manager.shutdown();
      
      expect(mockClose).toHaveBeenCalled();
      
      const statuses = manager.getConnectionStatuses();
      expect(Object.keys(statuses)).toHaveLength(0);
    });
  });
});