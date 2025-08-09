import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { MCPServerConfig, MCPTool } from '@/types';

export interface MCPConnection {
  id: string;
  client: Client;
  transport: StdioClientTransport;
  config: MCPServerConfig;
  tools: MCPTool[];
  status: 'connected' | 'disconnected' | 'error';
  lastError?: string;
  reconnectAttempts: number;
  lastReconnectTime?: Date;
}

export interface MCPClientManagerOptions {
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  connectionTimeout?: number;
}

/**
 * Manages connections to multiple MCP servers with lifecycle management,
 * connection pooling, and error recovery.
 */
export class MCPClientManager {
  private connections = new Map<string, MCPConnection>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private options: Required<MCPClientManagerOptions>;

  constructor(options: MCPClientManagerOptions = {}) {
    this.options = {
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      reconnectDelay: options.reconnectDelay ?? 5000,
      connectionTimeout: options.connectionTimeout ?? 10000,
    };
  }

  /**
   * Connect to an MCP server
   */
  async connectServer(config: MCPServerConfig): Promise<void> {
    if (!config.enabled) {
      console.log(`Server ${config.name} is disabled, skipping connection`);
      return;
    }

    const existingConnection = this.connections.get(config.id);
    if (existingConnection?.status === 'connected') {
      console.log(`Server ${config.name} is already connected`);
      return;
    }

    console.log(`Connecting to MCP server: ${config.name}`);

    try {
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      });

      const client = new Client(
        {
          name: 'mcp-chat-ui',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      // Set up connection timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Connection timeout after ${this.options.connectionTimeout}ms`));
        }, this.options.connectionTimeout);
      });

      // Connect with timeout
      await Promise.race([
        client.connect(transport),
        timeoutPromise,
      ]);

      // List available tools
      const toolsResult = await client.listTools();
      const tools: MCPTool[] = toolsResult.tools.map(tool => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema,
        serverId: config.id,
      }));

      const connection: MCPConnection = {
        id: config.id,
        client,
        transport,
        config: { ...config, status: 'connected' },
        tools,
        status: 'connected',
        reconnectAttempts: 0,
        lastError: undefined,
      };

      this.connections.set(config.id, connection);
      console.log(`Successfully connected to ${config.name} with ${tools.length} tools`);

      // Set up error handling for the connection
      this.setupConnectionErrorHandling(connection);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to connect to ${config.name}:`, errorMessage);

      const connection: MCPConnection = {
        id: config.id,
        client: null as any,
        transport: null as any,
        config: { ...config, status: 'error' },
        tools: [],
        status: 'error',
        lastError: errorMessage,
        reconnectAttempts: 0,
      };

      this.connections.set(config.id, connection);
      
      // Schedule reconnection if enabled
      if (config.enabled) {
        this.scheduleReconnection(config.id);
      }
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      console.log(`Server ${serverId} not found`);
      return;
    }

    console.log(`Disconnecting from MCP server: ${connection.config.name}`);

    // Clear any pending reconnection
    const timer = this.reconnectTimers.get(serverId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(serverId);
    }

    try {
      if (connection.client && connection.status === 'connected') {
        await connection.client.close();
      }
    } catch (error) {
      console.error(`Error closing connection to ${connection.config.name}:`, error);
    }

    // Update connection status
    connection.status = 'disconnected';
    connection.config.status = 'disconnected';
    connection.tools = [];
    connection.lastError = undefined;

    console.log(`Disconnected from ${connection.config.name}`);
  }

  /**
   * Reconnect to an MCP server
   */
  async reconnectServer(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      throw new Error(`Server ${serverId} not found`);
    }

    console.log(`Reconnecting to MCP server: ${connection.config.name}`);

    // Disconnect first
    await this.disconnectServer(serverId);

    // Reset reconnection attempts
    connection.reconnectAttempts = 0;

    // Reconnect
    await this.connectServer(connection.config);
  }

  /**
   * Get all available tools from connected servers
   */
  getAllTools(): MCPTool[] {
    const allTools: MCPTool[] = [];
    
    for (const connection of this.connections.values()) {
      if (connection.status === 'connected') {
        allTools.push(...connection.tools);
      }
    }

    return allTools;
  }

  /**
   * Get tools from a specific server
   */
  getServerTools(serverId: string): MCPTool[] {
    const connection = this.connections.get(serverId);
    return connection?.status === 'connected' ? connection.tools : [];
  }

  /**
   * Execute a tool on the appropriate server
   */
  async executeTool(toolName: string, parameters: any): Promise<any> {
    // Find the server that has this tool
    let targetConnection: MCPConnection | undefined;
    
    for (const connection of this.connections.values()) {
      if (connection.status === 'connected' && 
          connection.tools.some(tool => tool.name === toolName)) {
        targetConnection = connection;
        break;
      }
    }

    if (!targetConnection) {
      throw new Error(`Tool "${toolName}" not found in any connected server`);
    }

    console.log(`Executing tool "${toolName}" on server ${targetConnection.config.name}`);

    try {
      const result = await targetConnection.client.callTool({
        name: toolName,
        arguments: parameters,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Tool execution failed for "${toolName}":`, errorMessage);
      
      // If the error suggests connection issues, trigger reconnection
      if (this.isConnectionError(error)) {
        console.log(`Connection error detected, scheduling reconnection for ${targetConnection.config.name}`);
        this.scheduleReconnection(targetConnection.id);
      }
      
      throw new Error(`Tool execution failed: ${errorMessage}`);
    }
  }

  /**
   * Get connection status for all servers
   */
  getConnectionStatuses(): Record<string, { status: string; lastError?: string; toolCount: number }> {
    const statuses: Record<string, { status: string; lastError?: string; toolCount: number }> = {};
    
    for (const [id, connection] of this.connections.entries()) {
      statuses[id] = {
        status: connection.status,
        lastError: connection.lastError,
        toolCount: connection.tools.length,
      };
    }

    return statuses;
  }

  /**
   * Update server configurations and reconnect as needed
   */
  async updateServerConfigs(configs: MCPServerConfig[]): Promise<void> {
    const configMap = new Map(configs.map(config => [config.id, config]));
    
    // Disconnect servers that are no longer in the config or disabled
    for (const [id, connection] of this.connections.entries()) {
      const newConfig = configMap.get(id);
      if (!newConfig || !newConfig.enabled) {
        await this.disconnectServer(id);
        if (!newConfig) {
          this.connections.delete(id);
        }
      }
    }

    // Connect or reconnect servers
    for (const config of configs) {
      if (config.enabled) {
        const existingConnection = this.connections.get(config.id);
        
        if (!existingConnection) {
          // New server
          await this.connectServer(config);
        } else if (this.hasConfigChanged(existingConnection.config, config)) {
          // Configuration changed, reconnect
          console.log(`Configuration changed for ${config.name}, reconnecting...`);
          await this.reconnectServer(config.id);
        }
      }
    }
  }

  /**
   * Disconnect all servers and cleanup
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down MCP Client Manager...');
    
    // Clear all reconnection timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    // Disconnect all servers
    const disconnectPromises = Array.from(this.connections.keys()).map(id => 
      this.disconnectServer(id)
    );
    
    await Promise.allSettled(disconnectPromises);
    this.connections.clear();
    
    console.log('MCP Client Manager shutdown complete');
  }

  /**
   * Set up error handling for a connection
   */
  private setupConnectionErrorHandling(connection: MCPConnection): void {
    // Note: The MCP SDK client doesn't expose error events directly
    // Error handling is primarily done through try-catch in method calls
    // and connection status monitoring
  }

  /**
   * Schedule reconnection for a server
   */
  private scheduleReconnection(serverId: string): void {
    const connection = this.connections.get(serverId);
    if (!connection || !connection.config.enabled) {
      return;
    }

    if (connection.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.log(`Max reconnection attempts reached for ${connection.config.name}`);
      return;
    }

    // Clear existing timer
    const existingTimer = this.reconnectTimers.get(serverId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Calculate delay with exponential backoff
    const delay = this.options.reconnectDelay * Math.pow(2, connection.reconnectAttempts);
    
    console.log(`Scheduling reconnection for ${connection.config.name} in ${delay}ms (attempt ${connection.reconnectAttempts + 1})`);

    const timer = setTimeout(async () => {
      connection.reconnectAttempts++;
      connection.lastReconnectTime = new Date();
      
      try {
        await this.connectServer(connection.config);
      } catch (error) {
        console.error(`Reconnection failed for ${connection.config.name}:`, error);
        // Schedule next attempt if we haven't exceeded max attempts
        if (connection.reconnectAttempts < this.options.maxReconnectAttempts) {
          this.scheduleReconnection(serverId);
        }
      }
    }, delay);

    this.reconnectTimers.set(serverId, timer);
  }

  /**
   * Check if an error indicates a connection problem
   */
  private isConnectionError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    return errorMessage.includes('connection') ||
           errorMessage.includes('timeout') ||
           errorMessage.includes('econnrefused') ||
           errorMessage.includes('enotfound') ||
           errorMessage.includes('closed');
  }

  /**
   * Check if server configuration has changed
   */
  private hasConfigChanged(oldConfig: MCPServerConfig, newConfig: MCPServerConfig): boolean {
    return oldConfig.command !== newConfig.command ||
           JSON.stringify(oldConfig.args) !== JSON.stringify(newConfig.args) ||
           JSON.stringify(oldConfig.env) !== JSON.stringify(newConfig.env) ||
           oldConfig.enabled !== newConfig.enabled;
  }
}

// Singleton instance for the application
let mcpClientManager: MCPClientManager | null = null;

/**
 * Get the singleton MCP client manager instance
 */
export function getMCPClientManager(): MCPClientManager {
  if (!mcpClientManager) {
    mcpClientManager = new MCPClientManager();
  }
  return mcpClientManager;
}

/**
 * Initialize MCP client manager with server configurations
 */
export async function initializeMCPClientManager(configs: MCPServerConfig[]): Promise<MCPClientManager> {
  const manager = getMCPClientManager();
  await manager.updateServerConfigs(configs);
  return manager;
}