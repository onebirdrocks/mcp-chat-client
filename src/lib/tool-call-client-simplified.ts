import { frontendMCPServerManager } from './mcp-manager-frontend';

export interface ToolCall {
  id: string;
  toolName: string;
  input: any;
  serverName?: string; // 添加服务器名称
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
    stream: boolean = true  // 默认启用流式响应
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

      if (stream) {
        // 处理流式响应
        return this.handleStreamResponse(response);
      } else {
        // 处理非流式响应
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to call model with tools:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      throw error;
    }
  }

  // 处理流式响应
  private async handleStreamResponse(response: Response): Promise<any> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let content = '';
    let toolCalls: any[] = [];
    let toolResults: any[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                content += parsed.content;
              }
              if (parsed.toolCalls) {
                toolCalls.push(...parsed.toolCalls);
              }
              if (parsed.toolResults) {
                toolResults.push(...parsed.toolResults);
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (parseError) {
              console.warn('Failed to parse stream data:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      success: true,
      result: {
        text: content,
        toolCalls,
        toolResults
      }
    };
  }

  // 流式调用模型进行工具调用（带回调）
  async callModelWithToolsStream(
    providerId: string,
    modelId: string,
    prompt: string,
    historyMessages: any[],
    onContent?: (content: string) => void,
    onToolCalls?: (toolCalls: any[]) => void,
    onToolResults?: (toolResults: any[]) => void
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
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let content = '';
      let toolCalls: any[] = [];
      let toolResults: any[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.content) {
                  content += parsed.content;
                  onContent?.(parsed.content);
                }
                
                if (parsed.toolCalls) {
                  toolCalls.push(...parsed.toolCalls);
                  onToolCalls?.(parsed.toolCalls);
                }
                
                if (parsed.toolResults) {
                  toolResults.push(...parsed.toolResults);
                  onToolResults?.(parsed.toolResults);
                }
                
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (parseError) {
                console.warn('Failed to parse stream data:', data);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return {
        success: true,
        result: {
          text: content,
          toolCalls,
          toolResults
        }
      };
    } catch (error) {
      console.error('Failed to call model with tools (stream):', error);
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

  // 持续对话循环，每次工具调用都需要用户确认
  async startConversationLoop(
    providerId: string,
    modelId: string,
    initialPrompt: string,
    onMessage?: (message: string) => void,
    onToolCallsDetected?: (toolCalls: ToolCall[]) => Promise<boolean>, // 返回true表示用户确认执行
    onToolResults?: (results: ToolCallResult[]) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    let conversationHistory: any[] = [];
    let currentPrompt = initialPrompt;
    let loopCount = 0;
    const maxLoops = 10; // 防止无限循环

    try {
      while (loopCount < maxLoops) {
        loopCount++;
        console.log(`🔄 对话循环第 ${loopCount} 轮`);

        // 调用模型
        const response = await this.callModelWithTools(
          providerId,
          modelId,
          currentPrompt,
          conversationHistory,
          true // 使用流式响应
        );

        // 处理响应
        if (response.result?.text) {
          onMessage?.(response.result.text);
          
          // 添加助手回复到历史
          conversationHistory.push({
            role: 'assistant',
            content: response.result.text
          });
        }

        // 检查是否有工具调用
        if (response.result?.toolCalls && response.result.toolCalls.length > 0) {
          const toolCalls = response.result.toolCalls;
          console.log(`🔧 检测到 ${toolCalls.length} 个工具调用`);

          // 请求用户确认
          const userConfirmed = await onToolCallsDetected?.(toolCalls);
          
          if (!userConfirmed) {
            console.log('🚫 用户取消了工具调用');
            break;
          }

          // 执行工具调用
          console.log('✅ 用户确认，执行工具调用');
          const toolResults = await this.executeToolCalls(toolCalls);
          onToolResults?.(toolResults);

          // 将工具结果添加到历史
          const toolResultsText = toolResults
            .filter(result => result.success)
            .map(result => {
              let formattedResult;
              try {
                if (typeof result.result === 'object' && result.result !== null) {
                  if (result.result.content && Array.isArray(result.result.content)) {
                    formattedResult = result.result.content.map((item: any) => item.text || item).join('\n');
                  } else {
                    formattedResult = JSON.stringify(result.result, null, 2);
                  }
                } else {
                  formattedResult = String(result.result);
                }
              } catch (error) {
                formattedResult = String(result.result);
              }
              return `工具 ${result.toolCallId} 执行结果:\n${formattedResult}`;
            })
            .join('\n\n');

          if (toolResultsText) {
            conversationHistory.push({
              role: 'user',
              content: `工具执行完成，结果如下:\n${toolResultsText}\n\n请基于这些结果继续回答或执行下一步操作。`
            });
            
            // 设置下一轮的提示
            currentPrompt = '请基于工具执行结果继续回答或执行下一步操作。';
          }
        } else {
          // 没有工具调用，对话结束
          console.log('✅ 对话完成，没有更多工具调用');
          break;
        }
      }

      if (loopCount >= maxLoops) {
        console.warn('⚠️ 达到最大循环次数，停止对话');
        onError?.(new Error('达到最大对话循环次数'));
      }

    } catch (error) {
      console.error('❌ 对话循环出错:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // 继续对话（非流式）
  async continueConversationWithToolResults(
    providerId: string,
    modelId: string,
    prompt: string,
    historyMessages: any[],
    toolResults: ToolCallResult[]
  ): Promise<any> {
    // 过滤历史消息，移除不支持的角色
    const filteredMessages = historyMessages.filter(msg => 
      msg.role !== 'tool' && msg.role && msg.content && typeof msg.content === 'string'
    );
    
    // 将工具结果作为用户消息添加到对话中
    const messagesWithResults = [...filteredMessages];
    
    // 如果有工具结果，将它们作为用户消息添加，让LLM基于结果回答
    if (toolResults.length > 0) {
      const toolResultsText = toolResults
        .filter(result => result.success)
        .map(result => {
          // 尝试格式化工具结果为更可读的形式
          let formattedResult;
          try {
            if (typeof result.result === 'object' && result.result !== null) {
              // 如果是对象，尝试提取有用的信息
              if (result.result.content && Array.isArray(result.result.content)) {
                // MCP工具返回格式
                formattedResult = result.result.content.map((item: any) => item.text || item).join('\n');
              } else {
                formattedResult = JSON.stringify(result.result, null, 2);
              }
            } else {
              formattedResult = String(result.result);
            }
          } catch (error) {
            formattedResult = String(result.result);
          }
          return `工具执行结果:\n${formattedResult}`;
        })
        .join('\n\n');
      
      if (toolResultsText) {
        // 将工具结果作为用户消息，让LLM基于这些结果回答
        messagesWithResults.push({
          role: 'user',
          content: `以下是工具执行的结果，请基于这些结果回答用户的问题:\n\n${toolResultsText}\n\n请用中文总结和分析这些结果。`
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
    // 过滤历史消息，移除不支持的角色
    const filteredMessages = historyMessages.filter(msg => 
      msg.role !== 'tool' && msg.role && msg.content && typeof msg.content === 'string'
    );
    
    // 将工具结果作为助手消息添加到对话中
    const messagesWithResults = [...filteredMessages];
    
    // 如果有工具结果，将它们作为助手消息添加
    if (toolResults.length > 0) {
      const toolResultsText = toolResults
        .filter(result => result.success)
        .map(result => `工具执行结果: ${JSON.stringify(result.result, null, 2)}`)
        .join('\n\n');
      
      if (toolResultsText) {
        messagesWithResults.push({
          role: 'assistant',
          content: toolResultsText
        });
      }
    }

    return this.callModelWithTools(providerId, modelId, prompt, messagesWithResults, true);
  }
}

// 导出单例实例
export const simplifiedToolCallClient = new SimplifiedToolCallClient();
