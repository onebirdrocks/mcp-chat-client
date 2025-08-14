import { spawn } from 'child_process';
import { EventEmitter } from 'events';

export interface MCPToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  toolCallId: string;
  success: boolean;
  result?: any;
  error?: string;
}

export class MCPServerClient extends EventEmitter {
  private process: any;
  private isConnected: boolean = false;
  private messageId: number = 0;
  private pendingCalls: Map<string, { resolve: Function; reject: Function }> = new Map();

  constructor(private serverPath: string, private args: string[] = []) {
    super();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Starting MCP server: ${this.serverPath}`, this.args);
        
        this.process = spawn(this.serverPath, this.args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env }
        });

        this.process.stdout.on('data', (data: Buffer) => {
          const lines = data.toString().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              this.handleMessage(line);
            }
          }
        });

        this.process.stderr.on('data', (data: Buffer) => {
          console.error('MCP Server stderr:', data.toString());
        });

        this.process.on('close', (code: number) => {
          console.log(`MCP Server process exited with code ${code}`);
          this.isConnected = false;
          this.emit('disconnected', code);
        });

        this.process.on('error', (error: Error) => {
          console.error('MCP Server error:', error);
          reject(error);
        });

        // 等待初始化完成
        setTimeout(() => {
          this.isConnected = true;
          resolve();
        }, 1000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: string) {
    try {
      const data = JSON.parse(message);
      console.log('Received MCP message:', data);

      if (data.id && this.pendingCalls.has(data.id)) {
        const { resolve } = this.pendingCalls.get(data.id)!;
        this.pendingCalls.delete(data.id);
        resolve(data);
      }
    } catch (error) {
      console.error('Failed to parse MCP message:', error);
    }
  }

  private sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('MCP server not connected'));
        return;
      }

      const id = (++this.messageId).toString();
      message.id = id;

      this.pendingCalls.set(id, { resolve, reject });

      const messageStr = JSON.stringify(message) + '\n';
      console.log('Sending MCP message:', messageStr);
      
      this.process.stdin.write(messageStr);

      // 设置超时
      setTimeout(() => {
        if (this.pendingCalls.has(id)) {
          this.pendingCalls.delete(id);
          reject(new Error('MCP call timeout'));
        }
      }, 30000);
    });
  }

  async callTool(toolName: string, arguments_: Record<string, any>): Promise<any> {
    const message = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: arguments_
      }
    };

    const response = await this.sendMessage(message);
    
    if (response.error) {
      throw new Error(response.error.message || 'MCP tool call failed');
    }

    return response.result;
  }

  async getEpubFiles(path: string): Promise<string[]> {
    try {
      const result = await this.callTool('get_all_epub_files', { path });
      return result || [];
    } catch (error) {
      console.error('Error getting EPUB files:', error);
      throw error;
    }
  }

  async getPdfFiles(path: string): Promise<string[]> {
    try {
      const result = await this.callTool('get_all_pdf_files', { path });
      return result || [];
    } catch (error) {
      console.error('Error getting PDF files:', error);
      throw error;
    }
  }

  async getEpubMetadata(epubPath: string): Promise<any> {
    try {
      const result = await this.callTool('get_epub_metadata', { epub_path: epubPath });
      return result;
    } catch (error) {
      console.error('Error getting EPUB metadata:', error);
      throw error;
    }
  }

  async getPdfMetadata(pdfPath: string): Promise<any> {
    try {
      const result = await this.callTool('get_pdf_metadata', { pdf_path: pdfPath });
      return result;
    } catch (error) {
      console.error('Error getting PDF metadata:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.isConnected = false;
  }

  isServerConnected(): boolean {
    return this.isConnected;
  }
}

// 创建ebook-mcp客户端实例
export const ebookMCPClient = new MCPServerClient('/Users/onebird/github/ebook-mcp/.venv/bin/python3', ['/Users/onebird/github/ebook-mcp/main.py']);
