import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { spawn, ChildProcess } from 'child_process';
import { MCPServerConfig, MCPTool } from '../types';
import { mcpConfigManager } from '../mcp-config';

export interface MCPConnection {
  id: string;
  client: Client;
  transport: StdioClientTransport;
  process?: ChildProcess;
  config: MCPServerConfig;
  tools: MCPTool[];
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastError?: string;
  reconnectAttempts: number;
  lastReconnectTime?: Date;
  lastHealthCheck?: Date;
  connectionStartTime?: Date;
}

export interface MCPClientManagerOptions {
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  connectionTimeout?: number;
  healthCheckInterval?: number;
  toolCacheTimeout?: number;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  serverId: string;
  toolName: string;
}

export interface ServerHealthStatus {
  serverId: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime?: number;
  error?: string;
  toolCount: number;
  uptime?: number;
}

/**
 * Manages connections to multiple MCP servers with connection pooling,
 * lifecycle management, tool discovery with serverId prefixes, and automatic recovery.
 * 
 * Features:
 * - Connection pooling for multiple MCP servers
 * - Server lifecycle management (connect, disconnect, reconnect)
 * - Tool discovery with serverId prefixes to avoid naming conflicts
 * - Connection health monitoring and automatic recovery
 * - Exponential backoff for reconnection attempts
 * - Tool execution with timeout and error handling
 */
export class MCPClientManager {
  private connections = new Map<string, MCPConnection>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private healthCheckTimer?: NodeJS.Timeout;
  private toolCache = new Map<string, { tools: MCPTool[]; timestamp: Date }>();
  private options: Required<MCPClientManagerOptions>;
  private isShuttingDown = false;

  constructor(options: MCPClientManagerOptions = {}) {
    this.options = {
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      reconnectDelay: options.reconnectDelay ?? 2000,
      connectionTimeout: options.connectionTimeout ?? 15000,
      healthCheckInterval: options.healthCheckInterval ?? 30000,
      toolCacheTimeout: options.toolCacheTimeout ?? 60000,
    };

    // Start health monitoring
    this.startHealthMonitoring();

    // Listen for configuration changes
    mcpConfigManager.addWatcher(() => {
      this.handleConfigurationChange();
    });
  }

  /**
   * Initialize the manager with current configuration
   */
  async initialize(): Promise<void> {
    console.log('Initializing MCP Client Manager...');
    
    try {
      const config = await mcpConfigManager.getConfig();
      const serverConfigs = Object.entries(config.mcpServers).map(([id, serverConfig]) => ({
        id,
        name: id,
        command: serverConfig.command,
        args: serverConfig.args || [],
        env: serverConfig.env || {},
        enabled: !serverConfig.disabled,
        timeout: serverConfig.timeout,
        maxConcurrency: serverConfig.maxConcurrency,
      }));

      await this.updateServerConfigs(serverConfigs);
      console.log(`MCP Client Manager initialized with ${serverConfigs.length} server configurations`);
    } catch (error) {
      console.error('Failed to initialize MCP Client Manager:', error);
      throw error;
    }
  }

  /**
   * Connect to an MCP server with enhanced error handling and monitoring
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

    console.log(`Connecting to MCP server: ${config.name} (${config.command} ${config.args?.join(' ')})`);

    // Update status to connecting
    const connectingConnection: MCPConnection = {
      id: config.id,
      client: null as any,
      transport: null as any,
      config: { ...config, status: 'connecting' },
      tools: [],
      status: 'connecting',
      reconnectAttempts: existingConnection?.reconnectAttempts || 0,
      connectionStartTime: new Date(),
    };
    this.connections.set(config.id, connectingConnection);

    try {
      // Create transport with enhanced configuration
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: { ...process.env, ...config.env },
      });

      // Create client with proper capabilities
      const client = new Client(
        {
          name: 'mcp-chat-ui',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
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

      // Discover tools with serverId prefixes
      const tools = await this.discoverTools(client, config.id);

      // Create successful connection
      const connection: MCPConnection = {
        id: config.id,
        client,
        transport,
        config: { ...config, status: 'connected' },
        tools,
        status: 'connected',
        reconnectAttempts: 0,
        lastError: undefined,
        lastHealthCheck: new Date(),
        connectionStartTime: connectingConnection.connectionStartTime,
      };

      this.connections.set(config.id, connection);
      
      // Cache tools
      this.toolCache.set(config.id, {
        tools,
        timestamp: new Date(),
      });

      console.log(`Successfully connected to ${config.name} with ${tools.length} tools`);

      // Set up connection error handling
      this.setupConnectionErrorHandling(connection);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to connect to ${config.name}:`, errorMessage);

      const errorConnection: MCPConnection = {
        id: config.id,
        client: null as any,
        transport: null as any,
        config: { ...config, status: 'error' },
        tools: [],
        status: 'error',
        lastError: errorMessage,
        reconnectAttempts: connectingConnection.reconnectAttempts,
        connectionStartTime: connectingConnection.connectionStartTime,
      };

      this.connections.set(config.id, errorConnection);
      
      // Schedule reconnection if enabled and not shutting down
      if (config.enabled && !this.isShuttingDown) {
        this.scheduleReconnection(config.id);
      }
    }
  }

  /**
   * Disconnect from an MCP server with proper cleanup
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

      // Clean up process if exists
      if (connection.process && !connection.process.killed) {
        connection.process.kill('SIGTERM');
      }
    } catch (error) {
      console.error(`Error closing connection to ${connection.config.name}:`, error);
    }

    // Update connection status
    connection.status = 'disconnected';
    connection.config.status = 'disconnected';
    connection.tools = [];
    connection.lastError = undefined;

    // Clear tool cache
    this.toolCache.delete(serverId);

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

    // Reset reconnection attempts for manual reconnection
    connection.reconnectAttempts = 0;

    // Reconnect
    await this.connectServer(connection.config);
  }

  /**
   * Discover tools from a server with serverId prefixes
   */
  private async discoverTools(client: Client, serverId: string): Promise<MCPTool[]> {
    try {
      const toolsResult = await client.listTools();
      const tools: MCPTool[] = toolsResult.tools.map(tool => ({
        name: `${serverId}.${tool.name}`, // Add serverId prefix to avoid conflicts
        description: tool.description || '',
        inputSchema: tool.inputSchema,
        serverId: serverId,
        category: this.categorizeToolByName(tool.name),
        dangerous: this.isToolDangerous(tool.name, tool.description),
        requiresConfirmation: true, // All tools require confirmation by default
      }));

      console.log(`Discovered ${tools.length} tools from ${serverId}:`, tools.map(t => t.name));
      return tools;
    } catch (error) {
      console.error(`Failed to discover tools from ${serverId}:`, error);
      return [];
    }
  }

  /**
   * Get all available tools from connected servers with serverId prefixes
   */
  getAllTools(): MCPTool[] {
    const allTools: MCPTool[] = [];
    
    for (const connection of this.connections.values()) {
      if (connection.status === 'connected') {
        // Check cache first
        const cached = this.toolCache.get(connection.id);
        if (cached && this.isCacheValid(cached.timestamp)) {
          allTools.push(...cached.tools);
        } else {
          allTools.push(...connection.tools);
        }
      }
    }

    return allTools;
  }

  /**
   * Get tools from a specific server
   */
  getServerTools(serverId: string): MCPTool[] {
    const connection = this.connections.get(serverId);
    if (!connection || connection.status !== 'connected') {
      return [];
    }

    // Check cache first
    const cached = this.toolCache.get(serverId);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.tools;
    }

    return connection.tools;
  }

  /**
   * Execute a tool with enhanced error handling and monitoring
   */
  async executeTool(toolName: string, parameters: any): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    // Parse serverId from tool name (format: serverId.toolName)
    const [serverId, actualToolName] = this.parseToolName(toolName);
    
    if (!serverId || !actualToolName) {
      return {
        success: false,
        error: `Invalid tool name format: ${toolName}. Expected format: serverId.toolName`,
        executionTime: Date.now() - startTime,
        serverId: serverId || 'unknown',
        toolName: actualToolName || toolName,
      };
    }

    const connection = this.connections.get(serverId);
    if (!connection) {
      return {
        success: false,
        error: `Server "${serverId}" not found`,
        executionTime: Date.now() - startTime,
        serverId,
        toolName: actualToolName,
      };
    }

    if (connection.status !== 'connected') {
      return {
        success: false,
        error: `Server "${serverId}" is not connected (status: ${connection.status})`,
        executionTime: Date.now() - startTime,
        serverId,
        toolName: actualToolName,
      };
    }

    console.log(`Executing tool "${actualToolName}" on server ${serverId} with parameters:`, parameters);

    try {
      // Execute tool with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Tool execution timeout after ${connection.config.timeout || 30000}ms`));
        }, connection.config.timeout || 30000);
      });

      const result = await Promise.race([
        connection.client.callTool({
          name: actualToolName, // Use actual tool name without prefix for MCP call
          arguments: parameters,
        }),
        timeoutPromise,
      ]);

      const executionTime = Date.now() - startTime;
      console.log(`Tool "${actualToolName}" executed successfully in ${executionTime}ms`);

      return {
        success: true,
        result,
        executionTime,
        serverId,
        toolName: actualToolName,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Tool execution failed for "${actualToolName}" on ${serverId}:`, errorMessage);
      
      // If the error suggests connection issues, trigger reconnection
      if (this.isConnectionError(error)) {
        console.log(`Connection error detected, scheduling reconnection for ${serverId}`);
        this.scheduleReconnection(serverId);
      }
      
      return {
        success: false,
        error: errorMessage,
        executionTime,
        serverId,
        toolName: actualToolName,
      };
    }
  }

  /**
   * Get connection status for all servers
   */
  getConnectionStatuses(): Record<string, ServerHealthStatus> {
    const statuses: Record<string, ServerHealthStatus> = {};
    
    for (const [id, connection] of this.connections.entries()) {
      const uptime = connection.connectionStartTime 
        ? Date.now() - connection.connectionStartTime.getTime()
        : undefined;

      statuses[id] = {
        serverId: id,
        status: this.getHealthStatus(connection),
        lastCheck: connection.lastHealthCheck || new Date(),
        error: connection.lastError,
        toolCount: connection.tools.length,
        uptime,
      };
    }

    return statuses;
  }

  /**
   * Update server configurations and reconnect as needed
   */
  async updateServerConfigs(configs: MCPServerConfig[]): Promise<void> {
    console.log(`Updating server configurations for ${configs.length} servers`);
    
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
    const connectionPromises = configs
      .filter(config => config.enabled)
      .map(async (config) => {
        const existingConnection = this.connections.get(config.id);
        
        if (!existingConnection) {
          // New server
          await this.connectServer(config);
        } else if (this.hasConfigChanged(existingConnection.config, config)) {
          // Configuration changed, reconnect
          console.log(`Configuration changed for ${config.name}, reconnecting...`);
          await this.reconnectServer(config.id);
        }
      });

    // Connect servers in parallel but handle errors individually
    await Promise.allSettled(connectionPromises);
  }

  /**
   * Perform health check on all connected servers
   */
  async performHealthCheck(): Promise<void> {
    if (this.isShuttingDown) return;

    const healthCheckPromises = Array.from(this.connections.values())
      .filter(conn => conn.status === 'connected')
      .map(async (connection) => {
        try {
          const startTime = Date.now();
          
          // Simple health check by listing tools
          await connection.client.listTools();
          
          const responseTime = Date.now() - startTime;
          connection.lastHealthCheck = new Date();
          
          // Update tool cache if needed
          if (!this.isCacheValid(this.toolCache.get(connection.id)?.timestamp)) {
            const tools = await this.discoverTools(connection.client, connection.id);
            connection.tools = tools;
            this.toolCache.set(connection.id, {
              tools,
              timestamp: new Date(),
            });
          }
          
          console.log(`Health check passed for ${connection.config.name} (${responseTime}ms)`);
        } catch (error) {
          console.error(`Health check failed for ${connection.config.name}:`, error);
          
          if (this.isConnectionError(error)) {
            connection.status = 'error';
            connection.lastError = error instanceof Error ? error.message : 'Health check failed';
            this.scheduleReconnection(connection.id);
          }
        }
      });

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Shutdown the manager and cleanup all connections
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down MCP Client Manager...');
    this.isShuttingDown = true;
    
    // Stop health monitoring
    if (this.healthCheckTimer) {
      clearTimeout(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    
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
    this.toolCache.clear();
    
    console.log('MCP Client Manager shutdown complete');
  }

  // Private helper methods

  private startHealthMonitoring(): void {
    const runHealthCheck = async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Health check error:', error);
      } finally {
        if (!this.isShuttingDown) {
          this.healthCheckTimer = setTimeout(runHealthCheck, this.options.healthCheckInterval);
        }
      }
    };

    // Start first health check after initial delay
    this.healthCheckTimer = setTimeout(runHealthCheck, this.options.healthCheckInterval);
  }

  private async handleConfigurationChange(): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      console.log('Configuration changed, updating server connections...');
      const config = await mcpConfigManager.getConfig();
      const serverConfigs = Object.entries(config.mcpServers).map(([id, serverConfig]) => ({
        id,
        name: id,
        command: serverConfig.command,
        args: serverConfig.args || [],
        env: serverConfig.env || {},
        enabled: !serverConfig.disabled,
        timeout: serverConfig.timeout,
        maxConcurrency: serverConfig.maxConcurrency,
      }));

      await this.updateServerConfigs(serverConfigs);
    } catch (error) {
      console.error('Failed to handle configuration change:', error);
    }
  }

  private setupConnectionErrorHandling(connection: MCPConnection): void {
    // The MCP SDK doesn't expose error events directly
    // Error handling is primarily done through try-catch in method calls
    // and periodic health checks
  }

  private scheduleReconnection(serverId: string): void {
    const connection = this.connections.get(serverId);
    if (!connection || !connection.config.enabled || this.isShuttingDown) {
      return;
    }

    if (connection.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.log(`Max reconnection attempts (${this.options.maxReconnectAttempts}) reached for ${connection.config.name}`);
      connection.status = 'error';
      connection.lastError = 'Max reconnection attempts exceeded';
      return;
    }

    // Clear existing timer
    const existingTimer = this.reconnectTimers.get(serverId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Calculate delay with exponential backoff
    const delay = this.options.reconnectDelay * Math.pow(2, connection.reconnectAttempts);
    
    console.log(`Scheduling reconnection for ${connection.config.name} in ${delay}ms (attempt ${connection.reconnectAttempts + 1}/${this.options.maxReconnectAttempts})`);

    const timer = setTimeout(async () => {
      if (this.isShuttingDown) return;
      
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

  private parseToolName(toolName: string): [string | null, string | null] {
    const parts = toolName.split('.');
    if (parts.length < 2) {
      return [null, null];
    }
    
    const serverId = parts[0];
    const actualToolName = parts.slice(1).join('.');
    return [serverId, actualToolName];
  }

  private isConnectionError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    return errorMessage.includes('connection') ||
           errorMessage.includes('timeout') ||
           errorMessage.includes('econnrefused') ||
           errorMessage.includes('enotfound') ||
           errorMessage.includes('closed') ||
           errorMessage.includes('broken pipe') ||
           errorMessage.includes('socket');
  }

  private hasConfigChanged(oldConfig: MCPServerConfig, newConfig: MCPServerConfig): boolean {
    return oldConfig.command !== newConfig.command ||
           JSON.stringify(oldConfig.args) !== JSON.stringify(newConfig.args) ||
           JSON.stringify(oldConfig.env) !== JSON.stringify(newConfig.env) ||
           oldConfig.enabled !== newConfig.enabled ||
           oldConfig.timeout !== newConfig.timeout ||
           oldConfig.maxConcurrency !== newConfig.maxConcurrency;
  }

  private getHealthStatus(connection: MCPConnection): 'healthy' | 'unhealthy' | 'unknown' {
    if (connection.status !== 'connected') {
      return 'unhealthy';
    }
    
    if (!connection.lastHealthCheck) {
      return 'unknown';
    }
    
    const timeSinceLastCheck = Date.now() - connection.lastHealthCheck.getTime();
    const isStale = timeSinceLastCheck > this.options.healthCheckInterval * 2;
    
    return isStale ? 'unknown' : 'healthy';
  }

  private isCacheValid(timestamp?: Date): boolean {
    if (!timestamp) return false;
    const age = Date.now() - timestamp.getTime();
    return age < this.options.toolCacheTimeout;
  }

  private categorizeToolByName(toolName: string): string {
    const name = toolName.toLowerCase();
    
    if (name.includes('file') || name.includes('read') || name.includes('write')) {
      return 'filesystem';
    }
    if (name.includes('web') || name.includes('http') || name.includes('url')) {
      return 'web';
    }
    if (name.includes('search') || name.includes('query')) {
      return 'search';
    }
    if (name.includes('git') || name.includes('repo')) {
      return 'version-control';
    }
    
    return 'general';
  }

  private isToolDangerous(toolName: string, description?: string): boolean {
    const dangerousKeywords = [
      'delete', 'remove', 'destroy', 'kill', 'terminate',
      'format', 'wipe', 'clear', 'reset', 'drop',
      'execute', 'run', 'shell', 'command', 'script'
    ];
    
    const text = `${toolName} ${description || ''}`.toLowerCase();
    return dangerousKeywords.some(keyword => text.includes(keyword));
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
 * Initialize MCP client manager with current configuration
 */
export async function initializeMCPClientManager(): Promise<MCPClientManager> {
  const manager = getMCPClientManager();
  await manager.initialize();
  return manager;
}

/**
 * Shutdown MCP client manager
 */
export async function shutdownMCPClientManager(): Promise<void> {
  if (mcpClientManager) {
    await mcpClientManager.shutdown();
    mcpClientManager = null;
  }
}