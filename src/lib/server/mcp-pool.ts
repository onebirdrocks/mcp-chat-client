import { MCPServer, MCPTool } from '@/types/mcp';
import { createMCPClient } from './mcp-client';

export interface MCPConnection {
  id: string;
  server: MCPServer;
  client: ReturnType<typeof import('./mcp-client').createMCPClient>;
  isConnected: boolean;
  lastUsed: Date;
  tools: MCPTool[];
  errorCount: number;
  lastError: Error | null;
}

export class MCPConnectionPool {
  private connections: Map<string, MCPConnection> = new Map();
  private maxConnections: number = 10;

  async getConnection(server: MCPServer): Promise<MCPConnection> {
    const connectionId = this.getConnectionId(server);
    
    // Check if connection already exists and is connected
    let connection = this.connections.get(connectionId);
    if (connection && connection.isConnected) {
      connection.lastUsed = new Date();
      return connection;
    }

    // If connection exists but is disconnected, remove it
    if (connection) {
      try {
        await connection.client.disconnect();
      } catch (error) {
        console.error('Error disconnecting old connection:', error);
      }
      this.connections.delete(connectionId);
    }

    // Check if we're at max connections
    if (this.connections.size >= this.maxConnections) {
      await this.evictOldestConnection();
    }

    // Create new connection with retry logic
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Creating new MCP connection for server: ${server.name} (attempt ${attempt}/${maxRetries})`);
        
        // Create new connection
        const client = createMCPClient(server.name, {});
        connection = {
          id: connectionId,
          server,
          client,
          isConnected: false,
          lastUsed: new Date(),
          tools: [],
          errorCount: 0,
          lastError: null
        };

        // Connect to server
        await client.connect();
        connection.isConnected = true;
        
        // Discover tools
        const tools = await client.listTools();
        connection.tools = tools;
        connection.errorCount = 0;
        connection.lastError = null;
        
        this.connections.set(connectionId, connection);
        console.log(`Successfully created MCP connection for server: ${server.name} (${tools.length} tools)`);
        
        return connection;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Failed to create MCP connection for server ${server.name} (attempt ${attempt}/${maxRetries}):`, lastError.message);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed, create connection with error state
    console.error(`Failed to create MCP connection for server ${server.name} after ${maxRetries} attempts`);
    const client = createMCPClient(server.name, {});
    connection = {
      id: connectionId,
      server,
      client,
      isConnected: false,
      lastUsed: new Date(),
      tools: [],
      errorCount: maxRetries,
      lastError: lastError
    };
    
    this.connections.set(connectionId, connection);
    return connection;
  }

  async disconnectServer(serverId: string): Promise<void> {
    const connection = Array.from(this.connections.values()).find(c => c.server.id === serverId);
    if (connection) {
      try {
        await connection.client.disconnect();
      } catch (error) {
        console.error('Error disconnecting server:', error);
      }
      this.connections.delete(connection.id);
      console.log(`Disconnected MCP server: ${connection.server.name}`);
    }
  }

  getConnectionStatus(serverId: string): { isConnected: boolean; tools: MCPTool[] } {
    const connection = Array.from(this.connections.values()).find(c => c.server.id === serverId);
    if (connection) {
      return {
        isConnected: connection.isConnected,
        tools: connection.tools
      };
    }
    return { isConnected: false, tools: [] };
  }

  private getConnectionId(server: MCPServer): string {
    return `${server.name}-${server.command}-${(server.args || []).join('-')}`;
  }

  private async evictOldestConnection(): Promise<void> {
    if (this.connections.size === 0) return;

    const oldestConnection = Array.from(this.connections.values()).reduce((oldest, current) => {
      return current.lastUsed < oldest.lastUsed ? current : oldest;
    });

    await this.disconnectServer(oldestConnection.server.id);
  }

  getStats(): { totalConnections: number; connectedConnections: number } {
    const connectedCount = Array.from(this.connections.values()).filter(c => c.isConnected).length;
    return {
      totalConnections: this.connections.size,
      connectedConnections: connectedCount
    };
  }

  // Cleanup all connections
  async cleanup(): Promise<void> {
    console.log('Cleaning up MCP connection pool...');
    const connectionIds = Array.from(this.connections.keys());
    
    for (const connectionId of connectionIds) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        try {
          await connection.client.disconnect();
          console.log(`Disconnected server: ${connection.server.name}`);
        } catch (error) {
          console.error(`Error disconnecting server ${connection.server.name}:`, error);
        }
      }
    }
    
    this.connections.clear();
    console.log('MCP connection pool cleaned up');
  }
}

// Create singleton instance
export const mcpPool = new MCPConnectionPool();
