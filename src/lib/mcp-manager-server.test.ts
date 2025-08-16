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

    it('should return tools from connected servers', () => {
      const mockTools = [
        {
          name: 'get_all_epub_files',
          description: 'Get all epub files',
          inputSchema: { type: 'object', properties: { path: { type: 'string' } } }
        },
        {
          name: 'get_epub_metadata',
          description: 'Get epub metadata',
          inputSchema: { type: 'object', properties: { epub_path: { type: 'string' } } }
        }
      ];

      const mockClientWrapper = {
        server: {
          id: 'ebook-mcp',
          name: 'ebook-mcp',
          command: 'uv',
          args: ['run', 'main.py'],
          env: {},
          enabled: true,
          tools: mockTools,
          status: 'connected' as const
        },
        client: {},
        transport: {},
        tools: {},
        isConnected: true
      };

      // Mock the private clients Map
      const clientsMap = new Map();
      clientsMap.set('ebook-mcp', mockClientWrapper);
      (manager as any).clients = clientsMap;

      const tools = manager.getAllEnabledTools();

      expect(tools).toHaveProperty('ebook-mcp');
      expect(tools['ebook-mcp']).toHaveProperty('get_all_epub_files');
      expect(tools['ebook-mcp']).toHaveProperty('get_epub_metadata');
      
      // 检查工具格式
      expect(tools['ebook-mcp']['get_all_epub_files']).toEqual({
        type: 'function',
        function: {
          name: 'get_all_epub_files',
          description: 'Get all epub files (Use this tool to get all epub files)',
          parameters: { type: 'object', properties: { path: { type: 'string' } } }
        }
      });
    });

    it('should return tools from multiple connected servers', () => {
      const mockTools1 = [
        {
          name: 'get_all_epub_files',
          description: 'Get all epub files',
          inputSchema: { type: 'object', properties: { path: { type: 'string' } } }
        }
      ];

      const mockTools2 = [
        {
          name: 'get_all_pdf_files',
          description: 'Get all pdf files',
          inputSchema: { type: 'object', properties: { path: { type: 'string' } } }
        }
      ];

      const mockClientWrapper1 = {
        server: {
          id: 'ebook-mcp',
          name: 'ebook-mcp',
          command: 'uv',
          args: ['run', 'main.py'],
          env: {},
          enabled: true,
          tools: mockTools1,
          status: 'connected' as const
        },
        client: {},
        transport: {},
        tools: {},
        isConnected: true
      };

      const mockClientWrapper2 = {
        server: {
          id: 'pdf-mcp',
          name: 'pdf-mcp',
          command: 'uv',
          args: ['run', 'pdf.py'],
          env: {},
          enabled: true,
          tools: mockTools2,
          status: 'connected' as const
        },
        client: {},
        transport: {},
        tools: {},
        isConnected: true
      };

      // Mock the private clients Map
      const clientsMap = new Map();
      clientsMap.set('ebook-mcp', mockClientWrapper1);
      clientsMap.set('pdf-mcp', mockClientWrapper2);
      (manager as any).clients = clientsMap;

      const tools = manager.getAllEnabledTools();

      expect(tools).toHaveProperty('ebook-mcp');
      expect(tools).toHaveProperty('pdf-mcp');
      expect(tools['ebook-mcp']).toHaveProperty('get_all_epub_files');
      expect(tools['pdf-mcp']).toHaveProperty('get_all_pdf_files');
    });

    it('should filter out disconnected servers', () => {
      const mockClientWrapper = {
        server: {
          id: 'ebook-mcp',
          name: 'ebook-mcp',
          command: 'uv',
          args: ['run', 'main.py'],
          env: {},
          enabled: true,
          tools: [
            {
              name: 'get_all_epub_files',
              description: 'Get all epub files',
              inputSchema: { type: 'object', properties: { path: { type: 'string' } } }
            }
          ],
          status: 'disconnected' as const
        },
        client: {},
        transport: {},
        tools: {},
        isConnected: false
      };

      // Mock the private clients Map
      const clientsMap = new Map();
      clientsMap.set('ebook-mcp', mockClientWrapper);
      (manager as any).clients = clientsMap;

      const tools = manager.getAllEnabledTools();

      expect(tools).toEqual({});
    });

    it('should handle tools with invalid schema', () => {
      const mockTools = [
        {
          name: 'valid_tool',
          description: 'Valid tool',
          inputSchema: { type: 'object', properties: { path: { type: 'string' } } }
        },
        {
          name: 'invalid_tool',
          description: 'Invalid tool',
          inputSchema: null // 无效的schema
        }
      ];

      const mockClientWrapper = {
        server: {
          id: 'test-server',
          name: 'test-server',
          command: 'test',
          args: [],
          env: {},
          enabled: true,
          tools: mockTools,
          status: 'connected' as const
        },
        client: {},
        transport: {},
        tools: {},
        isConnected: true
      };

      // Mock the private clients Map
      const clientsMap = new Map();
      clientsMap.set('test-server', mockClientWrapper);
      (manager as any).clients = clientsMap;

      const tools = manager.getAllEnabledTools();

      expect(tools['test-server']).toHaveProperty('valid_tool');
      expect(tools['test-server']).not.toHaveProperty('invalid_tool');
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

   describe('getToolMetadata', () => {
     it('should return null for non-existent tool', () => {
       const metadata = manager.getToolMetadata('non-existent-tool');
       expect(metadata).toBeNull();
     });

     it('should return null when server is not connected', () => {
       // Mock getAllServers to return a server
       const mockServer = {
         id: 'test-server',
         name: 'test-server',
         command: 'test-command',
         args: [],
         env: {},
         enabled: true,
         tools: [],
         status: 'disconnected' as const
       };

       vi.spyOn(manager, 'getAllServers').mockReturnValue([mockServer]);

       const metadata = manager.getToolMetadata('test-server_tool1');
       expect(metadata).toBeNull();
     });

     it('should return tool metadata when tool exists and server is connected', () => {
       const mockTools = [
         {
           name: 'test-server_tool1',
           description: 'Test tool 1',
           inputSchema: { type: 'object', properties: { param1: { type: 'string' } } },
           outputSchema: { type: 'string' }
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

       const metadata = manager.getToolMetadata('test-server_tool1');

       expect(metadata).toEqual({
         toolName: 'test-server_tool1',
         serverName: 'test-server',
         description: 'Test tool 1',
         inputSchema: { type: 'object', properties: { param1: { type: 'string' } } },
         outputSchema: { type: 'string' },
         isConnected: true
       });
     });

     it('should return null when tool does not exist in connected server', () => {
       const mockTools = [
         {
           name: 'test-server_tool1',
           description: 'Test tool 1',
           inputSchema: { type: 'object' },
           outputSchema: { type: 'string' }
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

       const metadata = manager.getToolMetadata('test-server_nonexistent');
       expect(metadata).toBeNull();
     });
   });
});
