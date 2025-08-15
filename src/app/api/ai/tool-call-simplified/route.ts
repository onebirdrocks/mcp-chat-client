import { NextRequest, NextResponse } from 'next/server';
import { generateText, streamText } from 'ai';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

// 获取模型实例
function getModel(providerId: string, modelId: string) {
  const { openai } = require('@ai-sdk/openai');
  const { anthropic } = require('@ai-sdk/anthropic');
  const { google } = require('@ai-sdk/google');
  const { mistral } = require('@ai-sdk/mistral');
  const { cohere } = require('@ai-sdk/cohere');
  const { perplexity } = require('@ai-sdk/perplexity');
  const { fireworks } = require('@ai-sdk/fireworks');
  const { groq } = require('@ai-sdk/groq');
  const { deepseek } = require('@ai-sdk/deepseek');
  const { openrouter } = require('@openrouter/ai-sdk-provider');

  const providers = {
    openai: (modelId: string) => openai(modelId),
    anthropic: (modelId: string) => anthropic(modelId),
    google: (modelId: string) => google(modelId),
    mistral: (modelId: string) => mistral(modelId),
    cohere: (modelId: string) => cohere(modelId),
    perplexity: (modelId: string) => perplexity(modelId),
    fireworks: (modelId: string) => fireworks(modelId),
    groq: (modelId: string) => groq(modelId),
    deepseek: (modelId: string) => deepseek(modelId),
    openrouter: (modelId: string) => openrouter(modelId)
  };

  const provider = providers[providerId as keyof typeof providers];
  return provider ? provider(modelId) : null;
}

export async function POST(request: NextRequest) {
  try {
    const { providerId, modelId, prompt, historyMessages, stream = false } = await request.json();

    if (!providerId || !modelId || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: providerId, modelId, prompt' },
        { status: 400 }
      );
    }

    // 获取模型实例
    const model = getModel(providerId, modelId);
    if (!model) {
      return NextResponse.json(
        { error: `Model not found: ${providerId}/${modelId}` },
        { status: 404 }
      );
    }

    // 获取工具
    let tools = serverMCPServerManager.getAllEnabledTools();
    
    // 如果没有工具，尝试连接所有服务器
    if (Object.keys(tools).length === 0) {
      console.log('🔧 No tools found, attempting to connect all servers...');
      const servers = serverMCPServerManager.getAllServers();
      
      for (const server of servers) {
        try {
          console.log(`🔧 Attempting to connect to server: ${server.name}`);
          await serverMCPServerManager.connectServer(server.id);
          console.log(`🔧 Successfully connected to server: ${server.name}`);
        } catch (error) {
          console.error(`🔧 Failed to connect to server ${server.name}:`, error);
        }
      }
      
      // 重新获取工具
      tools = serverMCPServerManager.getAllEnabledTools();
      console.log('🔧 Tools after connecting servers:', Object.keys(tools));
    }
    console.log('🔧 Available tools for model:', Object.keys(tools));
    console.log('🔧 Tools count:', Object.keys(tools).length);
    console.log('🔧 ==========================================');
    console.log('🔧 TOOLS DEBUG INFO START');
    console.log('🔧 ==========================================');
    
    // 转换为AI SDK期望的格式
    const toolsArray = Object.entries(tools).map(([name, tool]) => tool);
    console.log('🔧 Tools array length:', toolsArray.length);
    
    // 检查是否有电子书相关工具
    const ebookTools = toolsArray.filter(tool => 
      tool.function.name.includes('get_all_') && 
      (tool.function.name.includes('pdf') || tool.function.name.includes('epub'))
    );
    console.log('🔧 Ebook tools for model:', ebookTools.length);
    console.log('🔧 Ebook tool names:', ebookTools.map(t => t.function.name));
    
    // 使用从MCP服务器获取的动态工具
    const toolsToUse = toolsArray;
    console.log('🔧 Using tools count:', toolsToUse.length);
    
    // 检查工具格式是否正确
    if (toolsToUse.length > 0) {
      console.log('🔧 First tool format:', JSON.stringify(toolsToUse[0], null, 2));
      console.log('🔧 First tool parameters:', JSON.stringify(toolsToUse[0].function.parameters, null, 2));
      
      // 检查所有工具的参数格式
      for (let i = 0; i < Math.min(toolsToUse.length, 10); i++) {
        const tool = toolsToUse[i];
        console.log(`🔧 Tool ${i} (${tool.function.name}) parameters:`, JSON.stringify(tool.function.parameters, null, 2));
      }
      
      // 检查是否有工具参数格式不正确
      const invalidTools = toolsToUse.filter((tool: any) => {
        const params = tool.function.parameters;
        return !params || !params.type || params.type !== 'object' || !params.properties;
      });
      
      if (invalidTools.length > 0) {
        console.log('🔧 Invalid tools found:', invalidTools.map((t: any) => t.function.name));
      }
    }
    console.log('🔧 ==========================================');
    console.log('🔧 TOOLS DEBUG INFO END');
    console.log('🔧 ==========================================');

    // 构建消息数组
    const messages: any[] = [];
    
    if (historyMessages && Array.isArray(historyMessages)) {
      messages.push(...historyMessages);
    }
    
    messages.push({ 
      role: 'user' as const, 
      content: prompt 
    });

    if (stream) {
                        // 流式响应
                  console.log('🔧 Final tools format before AI SDK call (streaming):', JSON.stringify(toolsToUse[0], null, 2));
                  
                  const result = await streamText({
                    model,
                    messages,
                    tools: toolsToUse.length > 0 ? toolsToUse as any : undefined,
                    toolChoice: toolsToUse.length > 0 ? 'auto' : undefined,
                    temperature: 0.7
                  });
      
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // 处理文本流
            for await (const chunk of result.textStream) {
              const data = JSON.stringify({ content: chunk });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
            
            // 检查是否有工具调用
            const toolCallsArray = await result.toolCalls;
            if (toolCallsArray && toolCallsArray.length > 0) {
              // 发送工具调用信息
              const toolCallsData = JSON.stringify({ 
                type: 'tool_calls', 
                toolCalls: result.toolCalls 
              });
              controller.enqueue(encoder.encode(`data: ${toolCallsData}\n\n`));
              
              // 执行工具调用
              const toolResults: any[] = [];
              
              for (const toolCall of toolCallsArray) {
                try {
                  const result = await serverMCPServerManager.executeTool(toolCall.toolName, toolCall.input as Record<string, unknown>);
                  const toolResult = {
                    toolCallId: toolCall.toolCallId,
                    success: true,
                    result
                  };
                  toolResults.push(toolResult);
                  
                  // 发送工具执行结果
                  const toolResultData = JSON.stringify({ 
                    type: 'tool_result', 
                    toolResult 
                  });
                  controller.enqueue(encoder.encode(`data: ${toolResultData}\n\n`));
                } catch (error) {
                  const toolResult = {
                    toolCallId: toolCall.toolCallId,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                  };
                  toolResults.push(toolResult);
                  
                  // 发送工具执行错误
                  const toolErrorData = JSON.stringify({ 
                    type: 'tool_error', 
                    toolResult 
                  });
                  controller.enqueue(encoder.encode(`data: ${toolErrorData}\n\n`));
                }
              }
              
              // 如果有工具调用，继续与AI对话
              if (toolResults.length > 0) {
                const finalMessages = [...messages];
                
                // 添加工具结果作为用户消息
                const toolResultsText = toolResults.map(result => 
                  result.success ? JSON.stringify(result.result) : `Error: ${result.error}`
                ).join('\n\n');
                
                finalMessages.push({
                  role: 'user' as const,
                  content: `工具执行结果：\n\n${toolResultsText}\n\n请基于这些结果继续回答。`
                });
                
                // 继续流式对话
                const finalResult = await streamText({
                  model,
                  messages: finalMessages,
                  tools: toolsToUse.length > 0 ? toolsToUse as any : undefined,
                  toolChoice: toolsToUse.length > 0 ? 'auto' : undefined,
                  temperature: 0.7
                });
                
                for await (const chunk of finalResult.textStream) {
                  const data = JSON.stringify({ content: chunk });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
              }
            }
            
            // 发送完成信号
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (error) {
            console.error('Error in stream:', error);
            const errorData = JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // 非流式响应 - 使用streamText然后收集结果
      console.log('🔧 About to call streamText with tools:', JSON.stringify(toolsToUse, null, 2));
      
                        // 使用工具调用
                  console.log('🔧 Final tools format before AI SDK call:', JSON.stringify(toolsToUse[0], null, 2));
                  
                  const result = await streamText({
                    model,
                    messages,
                    tools: toolsToUse.length > 0 ? toolsToUse as any : undefined,
                    toolChoice: toolsToUse.length > 0 ? 'auto' : undefined,
                    temperature: 0.7
                  });
      
      // 收集文本内容
      let textContent = '';
      for await (const chunk of result.textStream) {
        textContent += chunk;
      }
      
      // 检查是否有工具调用
      const toolCallsArray = await result.toolCalls;
      if (toolCallsArray && toolCallsArray.length > 0) {
        return NextResponse.json({
          success: true,
          result: {
            text: textContent,
            toolCalls: toolCallsArray,
            toolResults: []
          }
        });
      } else {
        return NextResponse.json({
          success: true,
          result: {
            text: textContent,
            toolCalls: [],
            toolResults: []
          }
        });
      }
    }

  } catch (error) {
    console.error('Error in simplified AI SDK tool call:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
