import { frontendMCPServerManager } from './mcp-manager-frontend';

export interface ToolCall {
  id: string;
  toolName: string;
  input: any;
}

export interface ToolCallResult {
  toolCallId: string;
  success: boolean;
  result?: any;
  error?: string;
}

export class SimplifiedToolCallClient {
  // 检查模型是否支持工具
  async checkModelSupportsTools(providerId: string, modelId: string): Promise<boolean> {
    // 简化实现：假设所有模型都支持工具
    return true;
  }

  // 启用所有MCP服务器工具
  async enableAllMCPServerTools(): Promise<void> {
    // 这个功能现在由MCP管理器自动处理
    console.log('MCP服务器工具已自动启用');
  }

  // 获取所有可用工具
  async getAllAvailableTools(): Promise<any[]> {
    const tools = await frontendMCPServerManager.getAllEnabledTools();
    return Object.entries(tools).map(([name, tool]) => ({
      name,
      description: (tool as any).description,
      inputSchema: (tool as any).inputSchema,
      outputSchema: (tool as any).outputSchema
    }));
  }

  // 调用模型进行工具调用
  async callModelWithTools(
    providerId: string,
    modelId: string,
    prompt: string,
    historyMessages: any[],
    stream: boolean = false
  ): Promise<any> {
    try {
      const response = await fetch('/api/ai/tool-call-simplified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId,
          modelId,
          prompt,
          historyMessages,
          stream
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to call model with tools:', error);
      throw error;
    }
  }

  // 执行工具调用
  async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];
    
    for (const toolCall of toolCalls) {
      try {
        const result = await frontendMCPServerManager.executeTool(toolCall.toolName, toolCall.input);
        results.push({
          toolCallId: toolCall.id,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          toolCallId: toolCall.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  // 继续对话（非流式）
  async continueConversationWithToolResults(
    providerId: string,
    modelId: string,
    prompt: string,
    historyMessages: any[],
    toolResults: ToolCallResult[]
  ): Promise<any> {
    const messagesWithResults = [...historyMessages];
    
    // 添加工具结果
    for (const result of toolResults) {
      if (result.success) {
        messagesWithResults.push({
          role: 'tool' as const,
          content: JSON.stringify(result.result),
          toolCallId: result.toolCallId
        });
      }
    }

    return this.callModelWithTools(providerId, modelId, prompt, messagesWithResults, false);
  }

  // 继续对话（流式）
  async continueConversationWithToolResultsStream(
    providerId: string,
    modelId: string,
    prompt: string,
    historyMessages: any[],
    toolResults: ToolCallResult[]
  ): Promise<any> {
    const messagesWithResults = [...historyMessages];
    
    // 添加工具结果
    for (const result of toolResults) {
      if (result.success) {
        messagesWithResults.push({
          role: 'tool' as const,
          content: JSON.stringify(result.result),
          toolCallId: result.toolCallId
        });
      }
    }

    return this.callModelWithTools(providerId, modelId, prompt, messagesWithResults, true);
  }
}

// 导出单例实例
export const simplifiedToolCallClient = new SimplifiedToolCallClient();
