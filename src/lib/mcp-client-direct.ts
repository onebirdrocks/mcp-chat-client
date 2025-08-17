import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class DirectMCPClient {
  private client: Client;
  private transport: StdioClientTransport;
  private isConnected: boolean = false;
  private connectionTimeout: number = 10000; // 10 seconds
  private retryAttempts: number = 3;
  private retryDelay: number = 1000; // 1 second

  constructor(private command: string, private args: string[] = [], private env: Record<string, string> = {}) {
    this.transport = new StdioClientTransport({
      command: this.command,
      args: this.args,
      env: { ...process.env, ...this.env }
    });
    this.client = new Client({
      name: "mcp-chat-client",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    });
  }

  async connect(): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`🔧 Direct MCP client connection attempt ${attempt}/${this.retryAttempts}`);
        
        // Add connection timeout
        const connectPromise = this.client.connect(this.transport);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), this.connectionTimeout);
        });
        
        await Promise.race([connectPromise, timeoutPromise]);
        this.isConnected = true;
        console.log(`🔧 Direct MCP client connected successfully on attempt ${attempt}`);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`🔧 Direct MCP client connection attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < this.retryAttempts) {
          console.log(`🔧 Retrying in ${this.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    
    throw new Error(`Failed to connect after ${this.retryAttempts} attempts. Last error: ${lastError?.message}`);
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.close();
      this.isConnected = false;
      console.log(`🔧 Direct MCP client disconnected`);
    }
  }

  async listTools(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }
    
    try {
      const result = await this.client.listTools();
      console.log(`🔧 Direct MCP client listed tools:`, result);
      return result;
    } catch (error) {
      console.error(`🔧 Direct MCP client listTools failed:`, error);
      throw error;
    }
  }

  async callTool(name: string, arguments_: Record<string, unknown>): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }

    try {
      console.log(`🔧 Direct MCP client calling tool: ${name}`);
      console.log(`🔧 Direct MCP client arguments:`, JSON.stringify(arguments_, null, 2));
      
      // Add timeout for tool calls
      const toolCallPromise = this.client.callTool({
        name,
        arguments: arguments_
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Tool call timeout')), this.connectionTimeout);
      });
      
      const result = await Promise.race([toolCallPromise, timeoutPromise]);
      
      console.log(`🔧 Direct MCP client tool result:`, JSON.stringify(result, null, 2));
      
      // Validate result structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid tool result format');
      }
      
      return result;
    } catch (error) {
      console.error(`🔧 Direct MCP client callTool failed:`, error);
      
      // Check if it's a connection error and mark as disconnected
      if (error instanceof Error && 
          (error.message.includes('connection') || 
           error.message.includes('EPIPE') || 
           error.message.includes('ECONNRESET'))) {
        this.isConnected = false;
      }
      
      throw error;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Set connection timeout
  setConnectionTimeout(timeout: number): void {
    this.connectionTimeout = timeout;
  }

  // Set retry configuration
  setRetryConfig(attempts: number, delay: number): void {
    this.retryAttempts = attempts;
    this.retryDelay = delay;
  }

  // Get server info
  async getServerInfo(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Client not connected');
    }

    try {
      // Try to get server information if available
      const info = await this.client.getServerVersion?.();
      return info || { name: 'Unknown', version: 'Unknown' };
    } catch (error) {
      console.warn('Could not get server info:', error);
      return { name: 'Unknown', version: 'Unknown' };
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      // Try to list tools as a health check
      await this.listTools();
      return true;
    } catch (error) {
      console.warn('Health check failed:', error);
      this.isConnected = false;
      return false;
    }
  }
}