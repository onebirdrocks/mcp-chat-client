import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export class ServerMCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private tools: MCPTool[] = [];
  private isConnected = false;
  private messageId = 0;

  constructor(
    private command: string,
    private args: string[] = [],
    private env: Record<string, string> = {}
  ) {
    super();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Start the MCP server process
        this.process = spawn(this.command, this.args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...this.env }
        });

        // Handle stdout (server responses)
        this.process.stdout?.on('data', (data) => {
          console.log('MCP Server stdout:', data.toString());
          const lines = data.toString().split('\n').filter((line: string) => line.trim());
          for (const line of lines) {
            try {
              const message = JSON.parse(line);
              console.log('Parsed MCP message:', message);
              this.handleMessage(message);
            } catch (error) {
              console.error('Failed to parse MCP message:', line, error);
            }
          }
        });

        // Handle stderr
        this.process.stderr?.on('data', (data) => {
          console.error('MCP Server stderr:', data.toString());
        });

        // Handle process exit
        this.process.on('exit', (code) => {
          console.log(`MCP Server exited with code ${code}`);
          this.isConnected = false;
          this.emit('disconnected', code);
        });

        // Wait a bit for the server to start
        setTimeout(() => {
          // Send initialization message
          const initMessage = {
            jsonrpc: '2.0',
            id: this.messageId++,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {}
              },
              clientInfo: {
                name: 'mcp-chat-client',
                version: '1.0.0'
              }
            }
          };
          
          console.log('Sending init message:', initMessage);
          this.sendMessage(initMessage);

          // Wait for initialized response
          const timeout = setTimeout(() => {
            console.error('MCP server initialization timeout');
            reject(new Error('MCP server initialization timeout'));
          }, 10000);

          // Wait for initialize response, then send initialized notification
          this.once('initialize_response', () => {
            console.log('Received initialize response');
            
            // Send initialized notification to server
            console.log('Sending initialized notification to server');
            this.sendMessage({
              jsonrpc: '2.0',
              method: 'notifications/initialized',
              params: {}
            });
            
            // Wait a bit more for the server to process the initialized notification
            setTimeout(() => {
              console.log('MCP server initialized successfully');
              clearTimeout(timeout);
              this.isConnected = true;
              resolve();
            }, 500);
          });
        }, 1000);

      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (!this.process) {
      return;
    }
    
    return new Promise((resolve) => {
      console.log(`Disconnecting MCP client for command: ${this.command}`);
      
      const process = this.process!;
      
      // Handle process exit
      const onExit = (code: number | null, signal: string | null) => {
        console.log(`MCP process exited with code ${code}, signal ${signal}`);
        this.process = null;
        this.isConnected = false;
        resolve();
      };
      
      process.on('exit', onExit);
      
      // Try graceful shutdown first
      try {
        process.kill('SIGTERM');
        
        // Wait for graceful shutdown
        setTimeout(() => {
          if (process && !process.killed) {
            console.log('Force killing MCP process');
            process.kill('SIGKILL');
          }
        }, 2000);
      } catch (error) {
        console.error('Error killing MCP process:', error);
        resolve();
      }
    });
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      
      this.sendMessage({
        jsonrpc: '2.0',
        id,
        method: 'tools/list'
      });

      const timeout = setTimeout(() => {
        reject(new Error('Tool list request timeout'));
      }, 5000);

      this.once(`response:${id}`, (response) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          this.tools = response.result.tools || [];
          resolve(this.tools);
        }
      });
    });
  }

  async callTool(toolName: string, arguments_: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      
      this.sendMessage({
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: arguments_
        }
      });

      const timeout = setTimeout(() => {
        reject(new Error('Tool call timeout'));
      }, 30000);

      this.once(`response:${id}`, (response) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  private sendMessage(message: Record<string, unknown>): void {
    if (this.process?.stdin) {
      const messageStr = JSON.stringify(message) + '\n';
      this.process.stdin.write(messageStr);
    }
  }

  private handleMessage(message: Record<string, unknown>): void {
    console.log('Handling MCP message:', message);
    
    if (message.id !== undefined) {
      // This is a response to a request
      console.log(`Emitting response for id ${message.id}`);
      this.emit(`response:${message.id}`, message);
      
      // If this is the initialize response, emit initialize_response event
      if (message.result && (message.result as Record<string, unknown>).serverInfo) {
        console.log('Received initialize response');
        this.emit('initialize_response');
      }
    } else if (message.method === 'notifications/initialized') {
      console.log('Received initialized notification');
      this.emit('initialized');
    } else if (message.method === 'tools/list') {
      // Handle tool list response
      this.tools = (message.params as Record<string, unknown>)?.tools as MCPTool[] || [];
    }
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  isServerConnected(): boolean {
    return this.isConnected;
  }
}

// Factory function to create MCP clients for different server types
export function createMCPClient(serverType: string, config: Record<string, unknown>): ServerMCPClient {
  switch (serverType) {
    case 'ebook-mcp':
      return new ServerMCPClient(
        '/Users/onebird/github/ebook-mcp/.venv/bin/python',
        ['/Users/onebird/github/ebook-mcp/src/ebook_mcp/main.py'],
        {}
      );
    case 'blender':
      return new ServerMCPClient('uvx', ['blender-mcp'], {});
    case 'weather':
      return new ServerMCPClient(
        'uvx',
        ['--directory', '/Users/onebird/github/mcp-servers/weather', 'run', 'weather.py'],
        {}
      );
    case 'youtube':
      return new ServerMCPClient('npx', ['-y', '@kazuph/mcp-youtube'], {});
    case 'Playwright':
      return new ServerMCPClient('npx', ['@playwright/mcp@latest'], {});
    default:
      throw new Error(`Unknown server type: ${serverType}`);
  }
}
