import { MCPServer, MCPTool } from '@/types/mcp';

class MCPServerManager {
  private servers: Map<string, MCPServer> = new Map();
  private statusCheckInterval: NodeJS.Timeout | null = null;
  private fileWatcher: ReturnType<typeof import('fs').watch> | null = null;

  // Add server
  addServer(server: Omit<MCPServer, 'id' | 'enabled' | 'tools' | 'lastConnected' | 'status'>): string {
    const id = this.generateId();
    const newServer: MCPServer = {
      ...server,
      id,
      enabled: true, // Default to enabled
      tools: [],
      status: 'disconnected',
    };
    
    this.servers.set(id, newServer);
    this.saveToStorage();
    return id;
  }

  // Update server
  updateServer(server: MCPServer): void {
    this.servers.set(server.id, server);
    if (typeof window !== 'undefined') {
      this.saveToStorage();
    }
  }

  // Delete server
  deleteServer(id: string): void {
    this.disconnectServer(id);
    this.servers.delete(id);
    this.saveToStorage();
  }

  // Get all servers
  getAllServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  // Get single server
  getServer(id: string): MCPServer | undefined {
    return this.servers.get(id);
  }

  // Enable/disable server
  async toggleServer(id: string, enabled: boolean): Promise<void> {
    const server = this.servers.get(id);
    if (!server) return;

    // Only perform actual connection/disconnection on server side
    if (typeof window === 'undefined') {
      if (enabled) {
        // Use connection pool to connect
        const { mcpPool } = await import('./server/mcp-pool');
        await mcpPool.getConnection(server);
        server.status = 'connected';
      } else {
        // Use connection pool to disconnect
        const { mcpPool } = await import('./server/mcp-pool');
        await mcpPool.disconnectServer(id);
        server.status = 'disconnected';
        server.tools = [];
      }
    }

    server.enabled = enabled;
    this.servers.set(id, server);
    // Don't save enabled state to file - it's managed in frontend
  }

  // Check server health
  async checkServerHealth(id: string): Promise<{ status: MCPServer['status']; tools?: MCPTool[] }> {
    const server = this.servers.get(id);
    if (!server) {
      return { status: 'disconnected' };
    }

    // Skip health check in browser environment
    if (typeof window !== 'undefined') {
      return { status: server.status };
    }

    try {
      // Use connection pool to check health
      const { mcpPool } = await import('./server/mcp-pool');
      const status = mcpPool.getConnectionStatus(id);
      
      if (status.isConnected) {
        return { 
          status: 'connected', 
          tools: status.tools 
        };
      } else {
        // Try to get connection
        const connection = await mcpPool.getConnection(server);
        return { 
          status: connection.isConnected ? 'connected' : 'error', 
          tools: connection.tools 
        };
      }
    } catch (error) {
      console.error(`Health check failed for server ${server.name}:`, error);
      return { status: 'error' };
    }
  }

  // Discover tools from server
  private async discoverTools(server: MCPServer): Promise<MCPTool[]> {
    // Skip tool discovery in browser environment
    if (typeof window !== 'undefined') {
      return [];
    }
    
    try {
      // Use connection pool to get or create connection
      const { mcpPool } = await import('./server/mcp-pool');
      const connection = await mcpPool.getConnection(server);
      return connection.tools;
    } catch (error) {
      console.error(`Failed to discover tools for server ${server.name}:`, error);
      return [];
    }
  }



  // Connect server
  private async connectServer(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (!server) return;

    try {
      console.log(`Connecting to MCP server: ${server.name}`);
      
      // Skip connection in browser environment
      if (typeof window !== 'undefined') {
        server.status = 'connected';
        server.lastConnected = new Date();
        this.servers.set(id, server);
        return;
      }
      
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Discover tools
      const tools = await this.discoverTools(server);

      server.tools = tools;
      server.status = 'connected';
      server.lastConnected = new Date();
      
      this.servers.set(id, server);
      this.saveToStorage();
      
    } catch (error) {
      console.error(`Failed to connect to MCP server ${server.name}:`, error);
      server.status = 'error';
      this.servers.set(id, server);
      this.saveToStorage();
      throw error;
    }
  }

  // Disconnect server
  private async disconnectServer(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (!server) return;

    try {
      console.log(`Disconnecting from MCP server: ${server.name}`);
      
      // Skip disconnection in browser environment
      if (typeof window !== 'undefined') {
        server.status = 'disconnected';
        server.tools = [];
        this.servers.set(id, server);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      server.status = 'disconnected';
      server.tools = [];
      this.servers.set(id, server);
      this.saveToStorage();
      
    } catch (error) {
      console.error(`Failed to disconnect from MCP server ${server.name}:`, error);
      throw error;
    }
  }

  // Get all enabled tools
  getAllEnabledTools(): MCPTool[] {
    const tools: MCPTool[] = [];
    for (const server of this.servers.values()) {
      if (server.enabled && server.tools) {
        // Add server prefix to tool names
        const prefixedTools = server.tools.map(tool => ({
          ...tool,
          name: `${server.name}:${tool.name}`,
          description: `[${server.name}] ${tool.description}`
        }));
        tools.push(...prefixedTools);
      }
    }
    return tools;
  }

  // Execute tool
  async executeTool(toolName: string, parameters: Record<string, unknown>): Promise<unknown> {
    console.log(`Executing tool: ${toolName}`, parameters);
    
    // Parse tool name to find server
    const [serverName, actualToolName] = toolName.split(':', 2);
    const server = Array.from(this.servers.values()).find(s => s.name === serverName);
    
    if (!server) {
      throw new Error(`Server ${serverName} not found`);
    }
    
    if (!server.enabled) {
      throw new Error(`Server ${serverName} is not enabled`);
    }
    
    // Simulate tool execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      server: serverName,
      tool: actualToolName,
      result: `Tool ${actualToolName} executed on server ${serverName} with parameters: ${JSON.stringify(parameters)}`
    };
  }

  // Connect enabled servers with error handling
  private async connectEnabledServers(): Promise<void> {
    if (typeof window !== 'undefined') {
      return;
    }

    console.log('Connecting enabled servers...');
    const enabledServers = Array.from(this.servers.values()).filter(server => server.enabled);
    
    for (const server of enabledServers) {
      try {
        console.log(`Auto-connecting enabled server: ${server.name}`);
        const { mcpPool } = await import('./server/mcp-pool');
        const connection = await mcpPool.getConnection(server);
        
        // Update server status based on connection result
        if (connection.isConnected) {
          server.status = 'connected';
          server.tools = connection.tools;
          console.log(`✅ Auto-connected server ${server.name}: ${connection.tools.length} tools`);
        } else {
          server.status = 'error';
          server.tools = [];
          console.log(`❌ Failed to auto-connect server ${server.name} after ${connection.errorCount} attempts`);
          if (connection.lastError) {
            console.error(`   Error: ${connection.lastError.message}`);
          }
        }
        
        this.servers.set(server.id, server);
      } catch (error) {
        console.error(`❌ Unexpected error auto-connecting server ${server.name}:`, error);
        server.status = 'error';
        server.tools = [];
        this.servers.set(server.id, server);
      }
    }
    
    const connectedCount = enabledServers.filter(s => s.status === 'connected').length;
    const errorCount = enabledServers.filter(s => s.status === 'error').length;
    console.log(`Server initialization complete: ${connectedCount} connected, ${errorCount} failed`);
  }

  // Start file watcher
  private startFileWatcher(): void {
    if (typeof window !== 'undefined') {
      return;
    }

    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), '.mcp-servers.json');
      
      console.log('Starting file watcher for:', filePath);
      
      // Store watcher reference for cleanup
      this.fileWatcher = fs.watch(filePath, async (eventType: string, filename: string) => {
        if (eventType === 'change') {
          console.log('MCP servers configuration file changed, reloading...');
          
          // Reload configuration
          this.loadFromStorage();
          
          // Reconnect enabled servers
          await this.connectEnabledServers();
          
          console.log('Configuration reloaded and servers reconnected');
        }
      });
    } catch (error) {
      console.error('Failed to start file watcher:', error);
    }
  }

  private stopFileWatcher(): void {
    if (this.fileWatcher) {
      try {
        this.fileWatcher.close();
        this.fileWatcher = null;
        console.log('File watcher stopped');
      } catch (error) {
        console.error('Error stopping file watcher:', error);
      }
    }
  }

  // Force refresh server connection
  async forceRefreshServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) return;

    console.log(`Force refreshing server: ${server.name}`);
    
    try {
      // Disconnect existing connection
      const { mcpPool } = await import('./server/mcp-pool');
      await mcpPool.disconnectServer(serverId);
      
      // Reconnect
      const connection = await mcpPool.getConnection(server);
      
      // Update server status
      server.status = connection.isConnected ? 'connected' : 'error';
      server.tools = connection.tools;
      this.servers.set(serverId, server);
      
      console.log(`Force refreshed server ${server.name}: ${connection.tools.length} tools`);
    } catch (error) {
      console.error(`Failed to force refresh server ${server.name}:`, error);
      server.status = 'error';
      server.tools = [];
      this.servers.set(serverId, server);
    }
  }

  // Start periodic health checks
  startHealthChecks(intervalMs: number = 30000): void {
    // Skip health checks in browser environment
    if (typeof window !== 'undefined') {
      return;
    }
    
    // Disable automatic health checks to prevent unnecessary MCP connections
    // Health checks will only be performed when explicitly requested
    console.log('Automatic health checks disabled to prevent unnecessary MCP connections');
  }

  // Stop health checks
  stopHealthChecks(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }



  // Load from storage
  loadFromStorage(): void {
    // Always load from file, whether on client or server side
    this.loadFromFile();
  }

  // Save to storage
  private saveToStorage(): void {
    try {
      const servers = Array.from(this.servers.values());
      // Always save to file
      this.saveToFile(servers);
    } catch (error) {
      console.error('Failed to save MCP servers to storage:', error);
    }
  }

  // Save to file
  private saveToFile(servers: MCPServer[]): void {
    // Only save to file on server side
    if (typeof window !== 'undefined') {
      return; // Skip file saving in browser environment
    }
    
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), '.mcp-servers.json');
      
      // Convert to simple format (only config, no UI state)
      const config: { mcpServers: Record<string, Record<string, unknown>> } = { mcpServers: {} };
      for (const server of servers) {
        config.mcpServers[server.name] = {
          command: server.command,
          args: server.args,
          env: server.env,
        };
      }
      
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
      console.log('MCP servers saved to file:', filePath);
    } catch (error) {
      console.error('Failed to save MCP servers to file:', error);
    }
  }

  // Load from file
  private loadFromFile(): void {
    // Only load from file on server side
    if (typeof window !== 'undefined') {
      return; // Skip file loading in browser environment
    }
    
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), '.mcp-servers.json');
      
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const config = JSON.parse(fileContent);
        
        // Handle both old format (array of servers) and new format (Cursor config)
        if (Array.isArray(config)) {
          // Old format - convert to new format
          this.servers.clear();
          for (const server of config) {
            if (server.lastConnected) {
              server.lastConnected = new Date(server.lastConnected);
            }
            this.servers.set(server.id, server);
          }
        } else if (config.mcpServers) {
          // New format
          this.servers.clear();
          for (const [name, configItem] of Object.entries(config.mcpServers)) {
            const id = this.generateId();
            const serverConfig = configItem as Record<string, unknown>;
            const server: MCPServer = {
              id,
              name,
              description: `MCP Server: ${name}`,
              command: serverConfig.command as string,
              args: (serverConfig.args as string[]) || [],
              env: (serverConfig.env as Record<string, string>) || {},
              enabled: true, // Default to enabled
              tools: [],
              status: 'disconnected',
            };
            this.servers.set(id, server);
          }
        }
        console.log('MCP servers loaded from file:', filePath);
      }
    } catch (error) {
      console.error('Failed to load MCP servers from file:', error);
    }
  }

  // Generate unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Initialize
  initialize(): void {
    // Only load from file on server side
    if (typeof window === 'undefined') {
      this.loadFromStorage();
      
      // Auto-connect enabled servers after loading
      this.connectEnabledServers();
      
      // Start file watcher
      this.startFileWatcher();
      
      // Setup process exit handlers
      this.setupProcessExitHandlers();
    }

    // Start health checks (now disabled)
    this.startHealthChecks();
  }

  private setupProcessExitHandlers(): void {
    // Handle graceful shutdown
    const cleanup = async () => {
      console.log('Cleaning up MCP manager...');
      await this.destroy();
    };

    // Handle different exit scenarios
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, cleaning up...');
      await cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, cleaning up...');
      await cleanup();
      process.exit(0);
    });

    process.on('exit', () => {
      console.log('Process exiting, cleaning up...');
      // Note: exit event doesn't support async operations
      this.stopHealthChecks();
      this.stopFileWatcher();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await cleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      await cleanup();
      process.exit(1);
    });
  }

  // Save configuration from JSON
  async saveConfigFromJson(config: { mcpServers: Record<string, any> }): Promise<void> {
    if (typeof window !== 'undefined') return; // Skip in browser
    
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const configPath = path.join(process.cwd(), '.mcp-servers.json');
      
      // Convert the new format to the expected format
      const serversArray = Object.entries(config.mcpServers).map(([name, serverConfig]) => ({
        id: this.generateId(),
        name,
        command: serverConfig.command || '',
        args: serverConfig.args || [],
        env: serverConfig.env || {},
        description: serverConfig.description || '',
        enabled: serverConfig.enabled !== false, // Default to true
        tools: [],
        status: 'disconnected' as const,
        lastConnected: null,
      }));
      
      // Save to file
      const fileContent = JSON.stringify({ mcpServers: config.mcpServers }, null, 2);
      fs.writeFileSync(configPath, fileContent, 'utf8');
      
      console.log('Configuration saved from JSON');
    } catch (error) {
      console.error('Failed to save configuration from JSON:', error);
      throw error;
    }
  }

  // Cleanup
  async destroy(): Promise<void> {
    console.log('Destroying MCP manager...');
    
    // Stop health checks
    this.stopHealthChecks();
    
    // Stop file watcher
    this.stopFileWatcher();
    
    // Cleanup connection pool
    try {
      const { mcpPool } = await import('./server/mcp-pool');
      await mcpPool.cleanup();
    } catch (error) {
      console.error('Error cleaning up connection pool:', error);
    }
    
    console.log('MCP manager destroyed');
  }
}

// Create singleton instance
export const mcpManager = new MCPServerManager();

// Initialize on app startup
if (typeof window !== 'undefined') {
  // Browser side: initialize without file loading
  mcpManager.initialize();
} else {
  // Server side: initialize with file loading
  mcpManager.initialize();
}
