import { NextRequest, NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

// 提供商配置
const PROVIDER_CONFIGS = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY'
  },
  anthropic: {
    baseURL: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY'
  },
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY'
  }
};

// 获取API密钥
function getApiKey(providerId: string): string {
  const config = PROVIDER_CONFIGS[providerId as keyof typeof PROVIDER_CONFIGS];
  if (!config) {
    throw new Error(`Unsupported provider: ${providerId}`);
  }
  
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) {
    throw new Error(`Missing API key for ${providerId}. Please set ${config.apiKeyEnv} environment variable.`);
  }
  
  return apiKey;
}

// 构建请求头
function buildHeaders(providerId: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  switch (providerId) {
    case 'openai':
    case 'openrouter':
      headers['Authorization'] = `Bearer ${apiKey}`;
      break;
    case 'anthropic':
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      break;
  }
  
  return headers;
}

// 转换工具格式为OpenAI格式
function convertToolsToOpenAIFormat(toolsByServer: Record<string, Record<string, any>>): any[] {
  const tools: any[] = [];
  
  for (const [serverName, serverTools] of Object.entries(toolsByServer)) {
    for (const [toolName, toolData] of Object.entries(serverTools)) {
      tools.push({
        type: 'function',
        function: {
          name: toolName,
          description: toolData.function.description,
          parameters: toolData.function.parameters
        }
      });
    }
  }
  
  return tools;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      providerId, 
      modelId, 
      prompt, 
      historyMessages = [], 
      temperature = 0.7,
      stream = true  // 默认启用流式响应
    } = body;

    console.log('🔧 API Request:', { providerId, modelId, prompt: prompt?.substring(0, 100) });

    // 验证必需参数
    if (!providerId || !modelId || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: providerId, modelId, prompt' },
        { status: 400 }
      );
    }

    // 获取工具
    let toolsByServer = serverMCPServerManager.getAllEnabledTools();
    
    // 如果没有工具，尝试自动连接所有服务器
    if (Object.keys(toolsByServer).length === 0) {
      console.log('🔧 No tools found, attempting to auto-connect servers...');
      try {
        await serverMCPServerManager.autoConnectAllServers();
        toolsByServer = serverMCPServerManager.getAllEnabledTools();
        console.log('🔧 Tools after auto-connecting servers:', Object.keys(toolsByServer));
      } catch (error) {
        console.error('🔧 Auto-connect failed:', error);
      }
    }

    // 转换工具格式
    const tools = convertToolsToOpenAIFormat(toolsByServer);
    console.log('🔧 Converted tools count:', tools.length);

    // 构建消息数组
    const messages: any[] = [];
    
    if (historyMessages && Array.isArray(historyMessages)) {
      for (const msg of historyMessages) {
        if (msg.role && msg.content && typeof msg.content === 'string') {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }
    }
    
    messages.push({ 
      role: 'user', 
      content: prompt 
    });

    // 获取API配置
    const config = PROVIDER_CONFIGS[providerId as keyof typeof PROVIDER_CONFIGS];
    if (!config) {
      return NextResponse.json(
        { error: `Unsupported provider: ${providerId}` },
        { status: 400 }
      );
    }

    const apiKey = getApiKey(providerId);
    const headers = buildHeaders(providerId, apiKey);

    // 构建请求体
    const requestBody: any = {
      model: modelId,
      messages,
      temperature,
      stream
    };

    // 只有在有工具时才添加tools字段
    if (tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    console.log('🔧 Request to LLM:', {
      url: `${config.baseURL}/chat/completions`,
      model: modelId,
      messagesCount: messages.length,
      toolsCount: tools.length,
      stream
    });

    // 发送请求到LLM API
    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔧 LLM API Error:', response.status, errorText);
      return NextResponse.json(
        { error: `LLM API Error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    if (stream) {
      // 流式响应
      const encoder = new TextEncoder();
      
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let buffer = '';
            
            // 用于累积工具调用参数
            const toolCallsBuffer: Record<string, {
              id: string;
              name: string;
              arguments: string;
            }> = {};

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                    continue;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    
                    // 检查是否有工具调用
                    if (parsed.choices?.[0]?.delta?.tool_calls) {
                      const toolCalls = parsed.choices[0].delta.tool_calls;
                      
                      for (const toolCall of toolCalls) {
                        const index = toolCall.index;
                        
                        // 初始化工具调用缓冲区
                        if (!toolCallsBuffer[index]) {
                          toolCallsBuffer[index] = {
                            id: toolCall.id || '',
                            name: toolCall.function?.name || '',
                            arguments: ''
                          };
                        }
                        
                        // 累积参数
                        if (toolCall.function?.arguments) {
                          toolCallsBuffer[index].arguments += toolCall.function.arguments;
                        }
                        
                        // 更新ID和名称（如果有的话）
                        if (toolCall.id) {
                          toolCallsBuffer[index].id = toolCall.id;
                        }
                        if (toolCall.function?.name) {
                          toolCallsBuffer[index].name = toolCall.function.name;
                        }
                      }
                    }
                    
                    // 检查是否工具调用完成
                    if (parsed.choices?.[0]?.finish_reason === 'tool_calls') {
                      // 处理完整的工具调用
                      const enhancedToolCalls = Object.values(toolCallsBuffer).map((toolCall) => {
                        // 找到对应的服务器
                        let serverName = '';
                        for (const [sName, serverTools] of Object.entries(toolsByServer)) {
                          if (serverTools[toolCall.name]) {
                            serverName = sName;
                            break;
                          }
                        }

                        let parsedArgs = {};
                        try {
                          if (toolCall.arguments) {
                            parsedArgs = JSON.parse(toolCall.arguments);
                          }
                        } catch (error) {
                          console.error('🔧 Error parsing tool arguments:', error, 'Arguments:', toolCall.arguments);
                        }

                        return {
                          toolCallId: toolCall.id,
                          toolName: toolCall.name,
                          args: parsedArgs,
                          serverName,
                          id: toolCall.id,
                          input: parsedArgs
                        };
                      });

                      const toolCallsData = JSON.stringify({ toolCalls: enhancedToolCalls });
                      controller.enqueue(encoder.encode(`data: ${toolCallsData}\n\n`));
                    }

                    // 转发原始数据
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                  } catch (parseError) {
                    console.error('🔧 Error parsing streaming data:', parseError);
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                  }
                }
              }
            }

            controller.close();
          } catch (error) {
            console.error('🔧 Streaming error:', error);
            const errorData = JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // 非流式响应
      const data = await response.json();
      
      // 检查是否有工具调用
      if (data.choices?.[0]?.message?.tool_calls) {
        const toolCalls = data.choices[0].message.tool_calls;
        
        // 转换工具调用格式
        const enhancedToolCalls = toolCalls.map((toolCall: any) => {
          // 找到对应的服务器
          let serverName = '';
          for (const [sName, serverTools] of Object.entries(toolsByServer)) {
            if (serverTools[toolCall.function?.name]) {
              serverName = sName;
              break;
            }
          }

          return {
            toolCallId: toolCall.id,
            toolName: toolCall.function?.name,
            args: toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {},
            serverName,
            id: toolCall.id,
            input: toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {}
          };
        });

        return NextResponse.json({
          ...data,
          toolCalls: enhancedToolCalls
        });
      }

      return NextResponse.json(data);
    }

  } catch (error) {
    console.error('🔧 API Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}