import { mcpManager } from './mcp-manager';
import { MCPTool } from '@/types/mcp';

// Chat message types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

export interface ToolResult {
  callId: string;
  result: any;
  error?: string;
}

// MCP Chat Integration class
export class MCPChatIntegration {
  private enabledTools: MCPTool[] = [];

  constructor() {
    this.refreshEnabledTools();
  }

  // Refresh enabled tools list
  refreshEnabledTools(): void {
    this.enabledTools = mcpManager.getAllEnabledTools();
  }

  // Check if message needs tool calls
  shouldUseTools(message: string): boolean {
    const toolKeywords = [
      'search', 'find', 'file', 'read', 'write', 'delete', 'create',
      'github', 'git', 'database', 'api', 'call', 'execute'
    ];

    return toolKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // Analyze user message and decide which tools to use
  async analyzeMessage(message: string): Promise<ToolCall[]> {
    this.refreshEnabledTools();
    
    const toolCalls: ToolCall[] = [];
    
    // Simple keyword matching logic
    if (message.includes('search') || message.includes('find')) {
      const searchTool = this.enabledTools.find(tool => 
        tool.name.includes('search') || tool.description.includes('search')
      );
      
      if (searchTool) {
        toolCalls.push({
          id: `call_${Date.now()}_1`,
          name: searchTool.name,
          arguments: {
            query: message.replace(/search|find/gi, '').trim(),
            path: '/'
          }
        });
      }
    }

    if (message.includes('read') || message.includes('file')) {
      const readTool = this.enabledTools.find(tool => 
        tool.name.includes('read') || tool.description.includes('read')
      );
      
      if (readTool) {
        // Simple file path extraction
        const pathMatch = message.match(/['"`]([^'"`]+\.\w+)['"`]/);
        const path = pathMatch ? pathMatch[1] : '/example/file.txt';
        
        toolCalls.push({
          id: `call_${Date.now()}_2`,
          name: readTool.name,
          arguments: { path }
        });
      }
    }

    return toolCalls;
  }

  // Execute tool calls
  async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of toolCalls) {
      try {
        const result = await mcpManager.executeTool(call.name, call.arguments);
        results.push({
          callId: call.id,
          result
        });
      } catch (error) {
        results.push({
          callId: call.id,
          result: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  // Process chat message
  async processMessage(message: string): Promise<{
    response: string;
    toolCalls: ToolCall[];
    toolResults: ToolResult[];
  }> {
    // Analyze if message needs tools
    const toolCalls = await this.analyzeMessage(message);
    
    if (toolCalls.length === 0) {
      // No tool calls, return normal response
      return {
        response: `I received your message: "${message}". No tools are available to handle this request.`,
        toolCalls: [],
        toolResults: []
      };
    }

    // Execute tool calls
    const toolResults = await this.executeToolCalls(toolCalls);

    // Generate response
    const response = this.generateResponse(message, toolCalls, toolResults);

    return {
      response,
      toolCalls,
      toolResults
    };
  }

  // Generate response
  private generateResponse(
    originalMessage: string, 
    toolCalls: ToolCall[], 
    toolResults: ToolResult[]
  ): string {
    let response = `I processed your request: "${originalMessage}"\n\n`;

    for (let i = 0; i < toolCalls.length; i++) {
      const call = toolCalls[i];
      const result = toolResults[i];

      response += `**Tool Call**: ${call.name}\n`;
      response += `**Arguments**: ${JSON.stringify(call.arguments, null, 2)}\n`;

      if (result.error) {
        response += `**Result**: Error - ${result.error}\n`;
      } else {
        response += `**Result**: ${JSON.stringify(result.result, null, 2)}\n`;
      }

      response += '\n';
    }

    return response;
  }

  // Get available tools list
  getAvailableTools(): MCPTool[] {
    return this.enabledTools;
  }

  // Check if tool is available
  isToolAvailable(toolName: string): boolean {
    return this.enabledTools.some(tool => tool.name === toolName);
  }
}

// Usage example
export async function createMCPChatIntegration(): Promise<MCPChatIntegration> {
  const integration = new MCPChatIntegration();
  
  // Ensure at least one enabled server
  const servers = mcpManager.getAllServers();
  if (servers.length === 0) {
    console.log('No MCP servers configured. Adding a test server...');
    
    const id = mcpManager.addServer({
      name: 'Test File System Server',
      description: 'Test file system server',
      command: 'npx @modelcontextprotocol/server-filesystem',
      args: ['--root', '/tmp'],
      env: {}
    });

    // Auto-enable server
    await mcpManager.toggleServer(id, true);
  }

  return integration;
}

// Usage in chat component
export async function handleChatMessage(message: string): Promise<ChatMessage> {
  const integration = await createMCPChatIntegration();
  
  const { response, toolCalls, toolResults } = await integration.processMessage(message);
  
  return {
    role: 'assistant',
    content: response,
    toolCalls,
    toolResults
  };
}
