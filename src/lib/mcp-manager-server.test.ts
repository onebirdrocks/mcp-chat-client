import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServerMCPServerManager } from './mcp-manager-server';

// Mock AI SDK
vi.mock('ai', () => ({
  experimental_createMCPClient: vi.fn(),
  jsonSchema: vi.fn((schema) => schema),
}));

vi.mock('ai/mcp-stdio', () => ({
  Experimental_StdioMCPTransport: vi.fn(),
}));

describe('ServerMCPServerManager', () => {
  let manager: ServerMCPServerManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ServerMCPServerManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getServer', () => {
    it('should return undefined for non-existent server', () => {
      const server = manager.getServer('non-existent');
      expect(server).toBeUndefined();
    });
  });

  describe('getConfigFilePath', () => {
    it('should return configuration file path', () => {
      const path = manager.getConfigFilePath();
      expect(path).toContain('.mcp-servers.json');
    });
  });

  describe('checkServerHealth', () => {
    it('should return disconnected status for non-existent server', async () => {
      const health = await manager.checkServerHealth('non-existent');
      expect(health).toEqual({ status: 'disconnected' });
    });
  });

  describe('getAllEnabledTools', () => {
    it('should return empty object when no servers are connected', () => {
      const tools = manager.getAllEnabledTools();
      expect(tools).toEqual({});
    });
  });

  describe('reloadConfig', () => {
    it('should clear all client connections', async () => {
      await manager.reloadConfig();
      // This test mainly verifies the method doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('addServer', () => {
    it('should throw error when server with same name already exists', async () => {
      // Mock getAllServers to return an existing server
      vi.spyOn(manager, 'getAllServers').mockReturnValue([
        {
          id: 'existing-server',
          name: 'existing-server',
          command: 'existing-command',
          args: [],
          env: {},
          enabled: true,
          tools: [],
          status: 'disconnected'
        }
      ]);

      await expect(manager.addServer({
        name: 'existing-server',
        command: 'new-command',
        args: [],
        env: {}
      })).rejects.toThrow("Server with name 'existing-server' already exists");
    });
  });

  describe('getServerConfigByName', () => {
    it('should return null for non-existent server', async () => {
      const config = await manager.getServerConfigByName('non-existent-server');
      expect(config).toBeNull();
    });

    it('should return server config without tools when server exists but not connected', async () => {
      // Mock getAllServers to return a server
      const mockServer = {
        id: 'test-server',
        name: 'test-server',
        command: 'test-command',
        args: ['arg1', 'arg2'],
        env: { TEST_ENV: 'test-value' },
        enabled: true,
        tools: [],
        status: 'disconnected' as const
      };

      vi.spyOn(manager, 'getAllServers').mockReturnValue([mockServer]);

      const config = await manager.getServerConfigByName('test-server');

      expect(config).toEqual({
        server: mockServer,
        tools: [],
        isConnected: false,
        clientWrapper: undefined
      });
    });

    it('should return server config with tools when server is connected', async () => {
      // Mock getAllServers to return a server
      const mockServer = {
        id: 'test-server',
        name: 'test-server',
        command: 'test-command',
        args: ['arg1', 'arg2'],
        env: { TEST_ENV: 'test-value' },
        enabled: true,
        tools: [],
        status: 'connected' as const
      };

      const mockTools = [
        {
          name: 'test-server_tool1',
          description: 'Test tool 1',
          inputSchema: { type: 'object', properties: {} },
          outputSchema: { type: 'string' }
        },
        {
          name: 'test-server_tool2',
          description: 'Test tool 2',
          inputSchema: { type: 'object', properties: {} },
          outputSchema: { type: 'number' }
        }
      ];

      const mockClientWrapper = {
        server: { ...mockServer, tools: mockTools },
        client: {},
        tools: {},
        isConnected: true
      };

      vi.spyOn(manager, 'getAllServers').mockReturnValue([mockServer]);
      
      // Mock the private clients Map
      const clientsMap = new Map();
      clientsMap.set('test-server', mockClientWrapper);
      (manager as any).clients = clientsMap;

      const config = await manager.getServerConfigByName('test-server');

      expect(config).toEqual({
        server: mockServer,
        tools: mockTools,
        isConnected: true,
        clientWrapper: mockClientWrapper
      });
    });

    it('should return server config with empty tools when server exists but no client wrapper', async () => {
      // Mock getAllServers to return a server
      const mockServer = {
        id: 'test-server',
        name: 'test-server',
        command: 'test-command',
        args: ['arg1', 'arg2'],
        env: { TEST_ENV: 'test-value' },
        enabled: true,
        tools: [],
        status: 'disconnected' as const
      };

      vi.spyOn(manager, 'getAllServers').mockReturnValue([mockServer]);
      
      // Ensure clients Map is empty
      (manager as any).clients = new Map();

      const config = await manager.getServerConfigByName('test-server');

      expect(config).toEqual({
        server: mockServer,
        tools: [],
        isConnected: false,
        clientWrapper: undefined
             });
     });
   });

   describe('getAllToolsMetadata', () => {
     it('should return empty array when no servers are connected', () => {
       const metadata = manager.getAllToolsMetadata();
       expect(metadata).toEqual([]);
     });

     it('should return tools metadata when servers are connected', () => {
       const mockTools = [
         {
           name: 'test-server_tool1',
           description: 'Test tool 1',
           inputSchema: { type: 'object', properties: { param1: { type: 'string' } } },
           outputSchema: { type: 'string' }
         },
         {
           name: 'test-server_tool2',
           description: 'Test tool 2',
           inputSchema: { type: 'object', properties: { param2: { type: 'number' } } },
           outputSchema: { type: 'number' }
         }
       ];

       const mockClientWrapper = {
         server: {
           id: 'test-server',
           name: 'test-server',
           command: 'test-command',
           args: [],
           env: {},
           enabled: true,
           tools: mockTools,
           status: 'connected' as const
         },
         client: {},
         tools: {},
         isConnected: true
       };

       // Mock the private clients Map
       const clientsMap = new Map();
       clientsMap.set('test-server', mockClientWrapper);
       (manager as any).clients = clientsMap;

       const metadata = manager.getAllToolsMetadata();

       expect(metadata).toHaveLength(2);
       expect(metadata[0]).toEqual({
         toolName: 'test-server_tool1',
         serverName: 'test-server',
         description: 'Test tool 1',
         inputSchema: { type: 'object', properties: { param1: { type: 'string' } } },
         outputSchema: { type: 'string' },
         isConnected: true
       });
       expect(metadata[1]).toEqual({
         toolName: 'test-server_tool2',
         serverName: 'test-server',
         description: 'Test tool 2',
         inputSchema: { type: 'object', properties: { param2: { type: 'number' } } },
         outputSchema: { type: 'number' },
         isConnected: true
       });
     });

     it('should return metadata from multiple connected servers', () => {
       const mockTools1 = [
         {
           name: 'server1_tool1',
           description: 'Server 1 tool 1',
           inputSchema: { type: 'object' },
           outputSchema: { type: 'string' }
         }
       ];

       const mockTools2 = [
         {
           name: 'server2_tool1',
           description: 'Server 2 tool 1',
           inputSchema: { type: 'object' },
           outputSchema: { type: 'number' }
         }
       ];

       const mockClientWrapper1 = {
         server: {
           id: 'server1',
           name: 'server1',
           command: 'server1-command',
           args: [],
           env: {},
           enabled: true,
           tools: mockTools1,
           status: 'connected' as const
         },
         client: {},
         tools: {},
         isConnected: true
       };

       const mockClientWrapper2 = {
         server: {
           id: 'server2',
           name: 'server2',
           command: 'server2-command',
           args: [],
           env: {},
           enabled: true,
           tools: mockTools2,
           status: 'connected' as const
         },
         client: {},
         tools: {},
         isConnected: true
       };

       // Mock the private clients Map
       const clientsMap = new Map();
       clientsMap.set('server1', mockClientWrapper1);
       clientsMap.set('server2', mockClientWrapper2);
       (manager as any).clients = clientsMap;

       const metadata = manager.getAllToolsMetadata();

       expect(metadata).toHaveLength(2);
       expect(metadata[0].serverName).toBe('server1');
       expect(metadata[1].serverName).toBe('server2');
     });
   });

   describe('getToolMetadata', () => {
     it('should return null for non-existent tool', () => {
       const metadata = manager.getToolMetadata('non-existent-tool');
       expect(metadata).toBeNull();
     });

     it('should return null when server is not connected', () => {
       const mockClientWrapper = {
         server: {
           id: 'test-server',
           name: 'test-server',
           command: 'test-command',
           args: [],
           env: {},
           enabled: true,
           tools: [
             {
               name: 'test-server_tool1',
               description: 'Test tool 1',
               inputSchema: { type: 'object' },
               outputSchema: { type: 'string' }
             }
           ],
           status: 'disconnected' as const
         },
         client: {},
         tools: {},
         isConnected: false
       };

       // Mock the private clients Map
       const clientsMap = new Map();
       clientsMap.set('test-server', mockClientWrapper);
       (manager as any).clients = clientsMap;

       const metadata = manager.getToolMetadata('test-server_tool1');
       expect(metadata).toBeNull();
     });

     it('should return tool metadata when tool exists and server is connected', () => {
       const mockTool = {
         name: 'test-server_tool1',
         description: 'Test tool 1',
         inputSchema: { 
           type: 'object', 
           properties: { 
             param1: { type: 'string' },
             param2: { type: 'number' }
           },
           required: ['param1']
         },
         outputSchema: { type: 'string' }
       };

       const mockClientWrapper = {
         server: {
           id: 'test-server',
           name: 'test-server',
           command: 'test-command',
           args: [],
           env: {},
           enabled: true,
           tools: [mockTool],
           status: 'connected' as const
         },
         client: {},
         tools: {},
         isConnected: true
       };

       // Mock the private clients Map
       const clientsMap = new Map();
       clientsMap.set('test-server', mockClientWrapper);
       (manager as any).clients = clientsMap;

       const metadata = manager.getToolMetadata('test-server_tool1');

       expect(metadata).toEqual({
         toolName: 'test-server_tool1',
         serverName: 'test-server',
         description: 'Test tool 1',
         inputSchema: { 
           type: 'object', 
           properties: { 
             param1: { type: 'string' },
             param2: { type: 'number' }
           },
           required: ['param1']
         },
         outputSchema: { type: 'string' },
         isConnected: true
       });
     });

     it('should return null when tool does not exist in connected server', () => {
       const mockClientWrapper = {
         server: {
           id: 'test-server',
           name: 'test-server',
           command: 'test-command',
           args: [],
           env: {},
           enabled: true,
           tools: [
             {
               name: 'test-server_tool1',
               description: 'Test tool 1',
               inputSchema: { type: 'object' },
               outputSchema: { type: 'string' }
             }
           ],
           status: 'connected' as const
         },
         client: {},
         tools: {},
         isConnected: true
       };

       // Mock the private clients Map
       const clientsMap = new Map();
       clientsMap.set('test-server', mockClientWrapper);
       (manager as any).clients = clientsMap;

       const metadata = manager.getToolMetadata('test-server_nonexistent-tool');
       expect(metadata).toBeNull();
     });
   });
});
