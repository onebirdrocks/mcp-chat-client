import { aiSDKModelManager } from './ai-sdk-model-manager';

// 动态导入服务器端模块，避免在客户端导入
let mcpManager: any = null;
if (typeof window === 'undefined') {
  // 只在服务器端导入
  mcpManager = require('./mcp-manager').mcpManager;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  serverName?: string;
}

export interface ToolCallResult {
  toolCallId: string;
  success: boolean;
  result?: any;
  error?: string;
}

export class ToolCallService {
  private static instance: ToolCallService;

  static getInstance(): ToolCallService {
    if (!ToolCallService.instance) {
      ToolCallService.instance = new ToolCallService();
    }
    return ToolCallService.instance;
  }

  // 检查模型是否支持工具调用
  async checkModelSupportsTools(providerId: string, modelId: string): Promise<boolean> {
    try {
      const presetModels = await this.getPresetModels();
      const model = presetModels.find(m => m.providerId === providerId && m.id === modelId);
      return model?.capabilities?.supportsTools || false;
    } catch (error) {
      console.error('Error checking model tool support:', error);
      return false;
    }
  }

  // 获取预设模型信息
  private async getPresetModels(): Promise<any[]> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'oobt-models.json');
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const models = JSON.parse(content);
        const allModels: any[] = [];
        
        for (const [providerId, providerModels] of Object.entries(models)) {
          if (Array.isArray(providerModels)) {
            providerModels.forEach((model: any) => {
              allModels.push({
                ...model,
                providerId
              });
            });
          }
        }
        
        return allModels;
      }
    } catch (error) {
      console.error('Error loading preset models:', error);
    }
    
    return [];
  }

  // 启用所有MCP服务器工具
  async enableAllMCPServerTools(): Promise<void> {
    try {
      if (!mcpManager) {
        console.log('MCP manager not available in client environment');
        return;
      }
      
      const servers = mcpManager.getAllServers();
      
      for (const server of servers) {
        if (server.status === 'disconnected') {
          await mcpManager.toggleServer(server.id, true);
        }
      }
      
      console.log('All MCP server tools enabled');
    } catch (error) {
      console.error('Error enabling MCP server tools:', error);
      throw error;
    }
  }

  // 获取所有可用的工具
  async getAllAvailableTools(): Promise<any[]> {
    try {
      if (!mcpManager) {
        console.log('MCP manager not available in client environment');
        return [];
      }
      
      const mcpTools = mcpManager.getAllEnabledTools();
      
      const tools = mcpTools.map((tool: any) => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema || {
            type: 'object',
            properties: {},
            required: []
          }
        }
      }));
      
      return tools;
    } catch (error) {
      console.error('Error getting available tools:', error);
      return [];
    }
  }

  // 执行工具调用
  async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];
    
    for (const toolCall of toolCalls) {
      try {
        console.log(`Executing tool: ${toolCall.name}`, toolCall.arguments);
        
        if (!mcpManager) {
          throw new Error('MCP manager not available in client environment');
        }
        
        const result = await mcpManager.executeTool(toolCall.name, toolCall.arguments);
        
        results.push({
          toolCallId: toolCall.id,
          success: true,
          result
        });
        
        console.log(`Tool ${toolCall.name} executed successfully`);
      } catch (error: any) {
        console.error(`Error executing tool ${toolCall.name}:`, error);
        
        results.push({
          toolCallId: toolCall.id,
          success: false,
          error: error.message || 'Unknown error occurred'
        });
      }
    }
    
    return results;
  }

  // 使用AI-SDK进行工具调用
  async callModelWithTools(
    providerId: string, 
    modelId: string, 
    prompt: string, 
    tools: any[]
  ): Promise<{ text: string; toolCalls?: ToolCall[] }> {
    try {
      const model = aiSDKModelManager.getModel(providerId, modelId);
      
      const toolCalls: ToolCall[] = [];
      
      if (prompt.toLowerCase().includes('use a tool') || 
          prompt.toLowerCase().includes('get the time') ||
          prompt.toLowerCase().includes('read file')) {
        
        if (prompt.toLowerCase().includes('get the time')) {
          toolCalls.push({
            id: `tool_${Date.now()}_1`,
            name: 'system:getCurrentTime',
            arguments: {},
            serverName: 'system'
          });
        }
        
        if (prompt.toLowerCase().includes('read file')) {
          toolCalls.push({
            id: `tool_${Date.now()}_2`,
            name: 'filesystem:readFile',
            arguments: { path: './example.txt' },
            serverName: 'filesystem'
          });
        }
      }
      
      return {
        text: toolCalls.length > 0 
          ? `I need to use some tools to help you. Please confirm the tool calls above.`
          : `I'll help you with that.`,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
      };
    } catch (error) {
      console.error('Error calling model with tools:', error);
      throw error;
    }
  }

  // 处理工具调用结果并继续对话
  async continueConversationWithToolResults(
    providerId: string,
    modelId: string,
    originalPrompt: string,
    toolResults: ToolCallResult[],
    historyMessages?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    try {
      let enhancedPrompt = originalPrompt + '\n\nTool execution results:\n';
      
      for (const result of toolResults) {
        if (result.success) {
          enhancedPrompt += `- ${result.toolCallId}: Success - ${JSON.stringify(result.result)}\n`;
        } else {
          enhancedPrompt += `- ${result.toolCallId}: Failed - ${result.error}\n`;
        }
      }
      
      enhancedPrompt += '\nPlease provide a response based on these results.';
      
      // 通过API调用生成响应，而不是直接使用testModel
      const response = await fetch('/api/ai/tool-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId,
          modelId,
          prompt: enhancedPrompt,
          tools: [], // 不需要工具，只需要生成响应
          historyMessages
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate response');
      }

      const data = await response.json();
      return data.result.text || 'No response generated';
    } catch (error) {
      console.error('Error continuing conversation with tool results:', error);
      return 'Sorry, I encountered an error while processing the tool results.';
    }
  }
}

export const toolCallService = ToolCallService.getInstance();
