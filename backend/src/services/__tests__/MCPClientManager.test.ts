import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPServerConfig } from '@/types';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(),
}));

// Import after mocking
import { MCPClientManager, getMCPClientManager, initializeMCPClientManager } from '../MCPClientManager';

describe('MCPClientManager', () => {
  let manager: MCPClientManager;
  let mockClientInstance: any;
  let mockTransportInstance: any;

  const mockServerConfig: MCPServerConfig = {
    id: 'test-server',
    name: 'Test Server',
    command: 'node',
    args: ['test-server.js'],
    env: { TEST_ENV: 'true' },
    enabled: true,
    status: 'disconnected',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    manager = new MCPClientManager({
      maxReconnectAttempts: 3,
      reconnectDelay: 1000,
      connectionTimeout: 5000,
    });

    // Set up mock instances
    mockClientInstance = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      listTools: vi.fn().mockResolvedValue({
        tools: [
          {
            name: 'test-tool',
            description: 'A test tool',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      }),
      callTool: vi.fn().mockResolvedValue({ result: 'success' }),
    };

    mockTransportInstance = {};

    // Configure mocks to return instances
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
    
    vi.mocked(Client).mockImplementation(() => mockClientInstance);
    vi.mocked(StdioClientTransport).mockImplementation(() => mockTransportInstance);
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('connectServer', () => {
    it('should successfully connect to an enabled server', async () => {
      await manager.connectServer(mockServerConfig);

      expect(mockClientInstance.connect).toHaveBeenCalledWith(mockTransportInstance);
      expect(mockClientInstance.listTools).toHaveBeenCalled();

      const statuses = manager.getConnectionStatuses();
      expect(statuses['test-server']).toEqual({
        status: 'connected',
        toolCount: 1,
      });
    });

    it('should skip connection for disabled servers', async () => {
      const disabledConfig = { ...mockServerConfig, enabled: false };
      
      await manager.connectServer(disabledConfig);

      expect(mockClientInstance.connect).not.toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      mockClientInstance.connect.mockRejectedValue(new Error('Connection failed'));

      await manager.connectServer(mockServerConfig);

      const statuses = manager.getConnectionStatuses();
      expect(statuses['test-server']).toEqual({
        status: 'error',
        lastError: 'Connection failed',
        toolCount: 0,
      });
    });

    it('should handle connection timeout', async () => {
      mockClientInstance.connect.mockImplementation(() => new Promise(() => {})); // Never resolves

      await manager.connectServer(mockServerConfig);

      const statuses = manager.getConnectionStatuses();
      expect(statuses['test-server'].status).toBe('error');
      expect(statuses['test-server'].lastError).toContain('timeout');
    }, 10000); // 10 second timeout for this test

    it('should not connect if already connected', async () => {
      // First connection
      await manager.connectServer(mockServerConfig);
      expect(mockClientInstance.connect).toHaveBeenCalledTimes(1);

      // Second connection attempt
      await manager.connectServer(mockServerConfig);
      expect(mockClientInstance.connect).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('disconnectServer', () => {
    it('should disconnect a connected server', async () => {
      await manager.connectServer(mockServerConfig);
      await manager.disconnectServer('test-server');

      expect(mockClientInstance.close).toHaveBeenCalled();

      const statuses = manager.getConnectionStatuses();
      expect(statuses['test-server'].status).toBe('disconnected');
    });

    it('should handle disconnection of non-existent server', async () => {
      // Should not throw
      await manager.disconnectServer('non-existent');
    });

    it('should handle client close errors', async () => {
      await manager.connectServer(mockServerConfig);
      mockClientInstance.close.mockRejectedValue(new Error('Close failed'));

      // Should not throw
      await manager.disconnectServer('test-server');

      const statuses = manager.getConnectionStatuses();
      expect(statuses['test-server'].status).toBe('disconnected');
    });
  });

  describe('reconnectServer', () => {
    it('should reconnect a server', async () => {
      await manager.connectServer(mockServerConfig);
      
      // Reset mock call count
      mockClientInstance.connect.mockClear();
      
      await manager.reconnectServer('test-server');

      expect(mockClientInstance.close).toHaveBeenCalled();
      expect(mockClientInstance.connect).toHaveBeenCalled();
    });

    it('should throw error for non-existent server', async () => {
      await expect(manager.reconnectServer('non-existent')).rejects.toThrow('Server non-existent not found');
    });
  });

  describe('getAllTools', () => {
    it('should return tools from all connected servers', async () => {
      await manager.connectServer(mockServerConfig);

      const tools = manager.getAllTools();
      expect(tools).toHaveLength(1);
      expect(tools[0]).toEqual({
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: { type: 'object', properties: {} },
        serverId: 'test-server',
      });
    });

    it('should return empty array when no servers connected', () => {
      const tools = manager.getAllTools();
      expect(tools).toEqual([]);
    });

    it('should only return tools from connected servers', async () => {
      // Connect server
      await manager.connectServer(mockServerConfig);
      
      // Disconnect server
      await manager.disconnectServer('test-server');

      const tools = manager.getAllTools();
      expect(tools).toEqual([]);
    });
  });

  describe('getServerTools', () => {
    it('should return tools for a specific connected server', async () => {
      await manager.connectServer(mockServerConfig);

      const tools = manager.getServerTools('test-server');
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test-tool');
    });

    it('should return empty array for disconnected server', async () => {
      await manager.connectServer(mockServerConfig);
      await manager.disconnectServer('test-server');

      const tools = manager.getServerTools('test-server');
      expect(tools).toEqual([]);
    });

    it('should return empty array for non-existent server', () => {
      const tools = manager.getServerTools('non-existent');
      expect(tools).toEqual([]);
    });
  });

  describe('executeTool', () => {
    it('should execute tool on the correct server', async () => {
      await manager.connectServer(mockServerConfig);

      const result = await manager.executeTool('test-tool', { param: 'value' });

      expect(mockClientInstance.callTool).toHaveBeenCalledWith({
        name: 'test-tool',
        arguments: { param: 'value' },
      });
      expect(result).toEqual({ result: 'success' });
    });

    it('should throw error for non-existent tool', async () => {
      await manager.connectServer(mockServerConfig);

      await expect(manager.executeTool('non-existent-tool', {})).rejects.toThrow(
        'Tool "non-existent-tool" not found in any connected server'
      );
    });

    it('should handle tool execution errors', async () => {
      await manager.connectServer(mockServerConfig);
      mockClientInstance.callTool.mockRejectedValue(new Error('Tool execution failed'));

      await expect(manager.executeTool('test-tool', {})).rejects.toThrow(
        'Tool execution failed: Tool execution failed'
      );
    });

    it('should schedule reconnection on connection errors', async () => {
      await manager.connectServer(mockServerConfig);
      
      // Mock a connection error
      const connectionError = new Error('Connection closed');
      mockClientInstance.callTool.mockRejectedValue(connectionError);

      await expect(manager.executeTool('test-tool', {})).rejects.toThrow();
      
      // Verify that reconnection would be scheduled (we can't easily test the timer)
      // This is more of an integration test concern
    });
  });

  describe('updateServerConfigs', () => {
    it('should connect new enabled servers', async () => {
      const configs = [mockServerConfig];
      
      await manager.updateServerConfigs(configs);

      expect(mockClientInstance.connect).toHaveBeenCalled();
      const statuses = manager.getConnectionStatuses();
      expect(statuses['test-server'].status).toBe('connected');
    });

    it('should disconnect removed servers', async () => {
      // First connect a server
      await manager.connectServer(mockServerConfig);
      
      // Then update with empty config (removes the server)
      await manager.updateServerConfigs([]);

      expect(mockClientInstance.close).toHaveBeenCalled();
      const statuses = manager.getConnectionStatuses();
      expect(statuses['test-server']).toBeUndefined();
    });

    it('should disconnect disabled servers', async () => {
      // First connect a server
      await manager.connectServer(mockServerConfig);
      
      // Then update with disabled config
      const disabledConfig = { ...mockServerConfig, enabled: false };
      await manager.updateServerConfigs([disabledConfig]);

      expect(mockClientInstance.close).toHaveBeenCalled();
      const statuses = manager.getConnectionStatuses();
      expect(statuses['test-server'].status).toBe('disconnected');
    });

    it('should reconnect servers with changed configuration', async () => {
      // First connect a server
      await manager.connectServer(mockServerConfig);
      
      // Clear mock calls
      mockClientInstance.connect.mockClear();
      mockClientInstance.close.mockClear();
      
      // Update with changed config
      const changedConfig = { ...mockServerConfig, command: 'python' };
      await manager.updateServerConfigs([changedConfig]);

      expect(mockClientInstance.close).toHaveBeenCalled();
      expect(mockClientInstance.connect).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should disconnect all servers and cleanup', async () => {
      await manager.connectServer(mockServerConfig);
      
      await manager.shutdown();

      expect(mockClientInstance.close).toHaveBeenCalled();
      const statuses = manager.getConnectionStatuses();
      expect(Object.keys(statuses)).toHaveLength(0);
    });
  });

  describe('singleton functions', () => {
    it('should return the same instance from getMCPClientManager', () => {
      const manager1 = getMCPClientManager();
      const manager2 = getMCPClientManager();
      
      expect(manager1).toBe(manager2);
    });

    it('should initialize manager with configs', async () => {
      const configs = [mockServerConfig];
      
      const manager = await initializeMCPClientManager(configs);
      
      expect(manager).toBeInstanceOf(MCPClientManager);
      expect(mockClientInstance.connect).toHaveBeenCalled();
    });
  });

  describe('error recovery', () => {
    it('should identify connection errors correctly', async () => {
      await manager.connectServer(mockServerConfig);
      
      const connectionErrors = [
        new Error('connection refused'),
        new Error('timeout occurred'),
        new Error('ECONNREFUSED'),
        new Error('ENOTFOUND'),
        new Error('connection closed'),
      ];

      for (const error of connectionErrors) {
        mockClientInstance.callTool.mockRejectedValueOnce(error);
        
        await expect(manager.executeTool('test-tool', {})).rejects.toThrow();
      }
    });

    it('should handle configuration changes correctly', async () => {
      const config1 = { ...mockServerConfig, command: 'node' };
      const config2 = { ...mockServerConfig, command: 'python' };
      const config3 = { ...mockServerConfig, args: ['different.js'] };
      const config4 = { ...mockServerConfig, env: { DIFFERENT: 'true' } };
      const config5 = { ...mockServerConfig, enabled: false };

      await manager.connectServer(config1);
      
      // Each of these should trigger a reconnection
      for (const config of [config2, config3, config4, config5]) {
        mockClientInstance.connect.mockClear();
        mockClientInstance.close.mockClear();
        
        await manager.updateServerConfigs([config]);
        
        if (config.enabled) {
          expect(mockClientInstance.close).toHaveBeenCalled();
          expect(mockClientInstance.connect).toHaveBeenCalled();
        } else {
          expect(mockClientInstance.close).toHaveBeenCalled();
          expect(mockClientInstance.connect).not.toHaveBeenCalled();
        }
      }
    });
  });
});