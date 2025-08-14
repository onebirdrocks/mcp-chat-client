import { aiSDKModelManager } from './ai-sdk-model-manager';
import { generateText } from 'ai';

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

export class ToolCallClientService {
  private static instance: ToolCallClientService;

  static getInstance(): ToolCallClientService {
    if (!ToolCallClientService.instance) {
      ToolCallClientService.instance = new ToolCallClientService();
    }
    return ToolCallClientService.instance;
  }

  // 检查模型是否支持工具调用
  async checkModelSupportsTools(providerId: string, modelId: string): Promise<boolean> {
    try {
      // 通过API检查模型能力
      const response = await fetch('/api/llm/models');
      if (response.ok) {
        const data = await response.json();
        const model = data.groups
          ?.flatMap((group: any) => group.models)
          ?.find((m: any) => m.providerId === providerId && m.id === modelId);
        
        return model?.capabilities?.supportsTools || false;
      }
      return false;
    } catch (error) {
      console.error('Error checking model tool support:', error);
      return false;
    }
  }

  // 启用所有MCP服务器工具
  async enableAllMCPServerTools(): Promise<void> {
    try {
      // 通过API启用MCP服务器
      const response = await fetch('/api/mcp/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: true }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to enable MCP servers');
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
      // 通过API获取MCP工具
      const response = await fetch('/api/mcp/tools');
      if (response.ok) {
        const data = await response.json();
        return data.tools || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting available tools:', error);
      return [];
    }
  }

  // 执行工具调用
  async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolCallResult[]> {
    try {
      // 通过API执行工具调用
      const response = await fetch('/api/mcp/execute-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toolCalls }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.results || [];
      } else {
        throw new Error('Failed to execute tools');
      }
    } catch (error: any) {
      console.error('Error executing tool calls:', error);
      return toolCalls.map(toolCall => ({
        toolCallId: toolCall.id,
        success: false,
        error: error.message || 'Unknown error occurred'
      }));
    }
  }

  // 使用AI-SDK进行工具调用
    async callModelWithTools(
    providerId: string,
    modelId: string,
    prompt: string,
    tools: any[],
    historyMessages?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<{ text: string; toolCalls?: ToolCall[] }> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries} to call model with tools`);
        
        // 通过服务器端API进行工具调用（确保能读取环境变量）
        const response = await fetch('/api/ai/tool-call', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            providerId,
            modelId,
            prompt,
            tools,
            historyMessages
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to call AI model');
        }

        const data = await response.json();
        return data.result;
      } catch (error) {
        lastError = error as Error;
        console.error(`Error calling model with tools (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // 所有重试都失败了
    throw new Error(`Failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  // 构建工具调用提示
  private buildToolCallPrompt(userPrompt: string, availableTools: any[]): string {
    const toolDescriptions = availableTools.map(tool => {
      const func = tool.function;
      return `- ${func.name}: ${func.description}
  参数: ${JSON.stringify(func.parameters, null, 2)}`;
    }).join('\n');

    return `你是一个智能助手，需要判断用户请求是否需要使用工具。

可用工具:
${toolDescriptions}

用户请求: "${userPrompt}"

请分析用户请求，如果需要使用工具，请以JSON格式返回工具调用信息。
格式如下:
{
  "needsTools": true,
  "reasoning": "解释为什么需要工具",
  "toolCalls": [
    {
      "name": "工具名称",
      "arguments": {"参数": "值"}
    }
  ],
  "response": "对用户的回复"
}

如果不需要工具，返回:
{
  "needsTools": false,
  "reasoning": "解释为什么不需要工具",
  "response": "对用户的回复"
}

请只返回JSON格式的响应，不要包含其他内容。`;
  }

  // 解析AI的工具调用响应
  private parseToolCallResponse(response: string): { text: string; toolCalls: ToolCall[] } {
    try {
      // 尝试提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { text: response, toolCalls: [] };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.needsTools) {
        return { text: parsed.response || response, toolCalls: [] };
      }

      // 转换工具调用格式
      const toolCalls: ToolCall[] = (parsed.toolCalls || []).map((toolCall: any, index: number) => ({
        id: `tool_${Date.now()}_${index}`,
        name: toolCall.name,
        arguments: toolCall.arguments || {},
        serverName: this.getServerNameFromTool(toolCall.name)
      }));

      return {
        text: parsed.response || 'I need to use some tools to help you. Please confirm the tool calls above.',
        toolCalls
      };
    } catch (error) {
      console.error('Failed to parse tool call response:', error);
      return { text: response, toolCalls: [] };
    }
  }

  // 从工具名称获取服务器名称
  private getServerNameFromTool(toolName: string): string {
    // 工具名称格式: "serverName:toolName"
    if (toolName.includes(':')) {
      return toolName.split(':')[0];
    }
    return 'unknown';
  }

  // 处理工具调用结果并继续对话（流式版本）
  async continueConversationWithToolResultsStream(
    providerId: string,
    modelId: string,
    originalPrompt: string,
    toolResults: ToolCallResult[],
    historyMessages?: Array<{ role: 'user' | 'assistant'; content: string }>,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    try {
      const response = await fetch('/api/ai/tool-call-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId,
          modelId,
          originalPrompt,
          toolResults,
          historyMessages
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      let fullResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return fullResponse;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                onChunk?.(parsed.content);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('Error in continueConversationWithToolResultsStream:', error);
      throw error;
    }
  }

  // 处理工具调用结果并继续对话（非流式版本，保持向后兼容）
  async continueConversationWithToolResults(
    providerId: string,
    modelId: string,
    originalPrompt: string,
    toolResults: ToolCallResult[],
    historyMessages?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    return this.continueConversationWithToolResultsStream(
      providerId,
      modelId,
      originalPrompt,
      toolResults,
      historyMessages
    );
  }
}

export const toolCallClientService = ToolCallClientService.getInstance();
