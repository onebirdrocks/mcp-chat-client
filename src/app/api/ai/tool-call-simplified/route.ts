import { NextRequest, NextResponse } from 'next/server';
import { generateText, streamText } from 'ai';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';
import { z } from 'zod';

// 将JSON Schema转换为zod schema的辅助函数
function jsonSchemaToZod(schema: any): z.ZodType<any> {
  if (schema.type === 'object') {
    const shape: Record<string, z.ZodType<any>> = {};
    
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        const propSchema = prop as any;
        if (propSchema.type === 'string') {
          shape[key] = z.string();
        } else if (propSchema.type === 'integer') {
          shape[key] = z.number().int();
        } else if (propSchema.type === 'number') {
          shape[key] = z.number();
        } else if (propSchema.type === 'boolean') {
          shape[key] = z.boolean();
        } else {
          shape[key] = z.any();
        }
      }
    }
    
    let zodSchema = z.object(shape);
    
    // 处理required字段
    if (schema.required && Array.isArray(schema.required)) {
      for (const requiredField of schema.required) {
        if (shape[requiredField]) {
          // zod对象默认所有字段都是可选的，所以这里不需要特殊处理
        }
      }
    }
    
    return zodSchema;
  }
  
  return z.any();
}

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
    let toolsByServer = serverMCPServerManager.getAllEnabledTools();
    
    // 如果没有工具，尝试连接所有服务器
    if (Object.keys(toolsByServer).length === 0) {
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
      toolsByServer = serverMCPServerManager.getAllEnabledTools();
      console.log('🔧 Tools after connecting servers:', Object.keys(toolsByServer));
    }
    
    // 转换为AI SDK格式的工具
    const toolsToUse: Record<string, any> = {};
    
    for (const [serverName, serverTools] of Object.entries(toolsByServer)) {
      for (const [toolName, toolData] of Object.entries(serverTools)) {
        const functionData = toolData.function;
        
        // 使用 serverName_toolName 作为工具的唯一标识符
        const fullToolName = `${serverName}_${toolName}`;
        
        // 使用直接的JSON Schema定义工具
        toolsToUse[fullToolName] = {
          description: functionData.description,
          inputSchema: functionData.parameters, // 直接使用JSON Schema
          execute: async (args: any) => {
            console.log(`🔧 Executing tool ${fullToolName} with args:`, args);
            return await serverMCPServerManager.executeTool(fullToolName, args);
          }
        };
      }
    }
    
    console.log('🔧 Tools converted to AI SDK v5 format:', Object.keys(toolsToUse));
    console.log('🔧 Using tools count:', Object.keys(toolsToUse).length);
    
    // 检查工具格式是否正确
    if (Object.keys(toolsToUse).length > 0) {
      const firstToolName = Object.keys(toolsToUse)[0];
      console.log('🔧 First tool format:', firstToolName);
      console.log('🔧 Sample tool structure:', toolsToUse[firstToolName]);
      
      // 检查所有工具
      for (const [toolName, toolData] of Object.entries(toolsToUse)) {
        console.log(`🔧 Tool ${toolName}:`, toolData);
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
                  console.log('🔧 Final tools format before AI SDK call (streaming):', Object.keys(toolsToUse));
                  
                  // 构建请求体用于日志
                  const requestBody = {
                    model: model.modelId,
                    messages,
                    tools: Object.keys(toolsToUse).length > 0 ? toolsToUse : undefined,
                    temperature: 0.7
                  };
                  
                  console.log('🔧 Request body to LLM (streaming):', JSON.stringify(requestBody, null, 2));
                  
                  const result = await streamText({
                    model,
                    messages,
                    tools: Object.keys(toolsToUse).length > 0 ? toolsToUse : undefined,
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
            
            // AI-SDK会自动处理有execute函数的工具调用
            // 不需要手动处理工具调用
            
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
      console.log('🔧 About to call streamText with tools:', Object.keys(toolsToUse));
      
                        // 使用工具调用
                  console.log('🔧 Final tools format before AI SDK call:', Object.keys(toolsToUse));
                  
                  // 构建请求体用于日志
                  const requestBody = {
                    model: model.modelId,
                    messages,
                    tools: Object.keys(toolsToUse).length > 0 ? toolsToUse : undefined,
                    temperature: 0.7
                  };
                  
                  console.log('🔧 Request body to LLM (non-streaming):', JSON.stringify(requestBody, null, 2));
                  
                  const result = await streamText({
                    model,
                    messages,
                    tools: Object.keys(toolsToUse).length > 0 ? toolsToUse : undefined,
                    temperature: 0.7
                  });
      
      // 收集文本内容
      let textContent = '';
      for await (const chunk of result.textStream) {
        textContent += chunk;
      }
      
      // AI-SDK会自动处理工具调用，直接返回文本内容
      return NextResponse.json({
        success: true,
        result: {
          text: textContent,
          toolCalls: [],
          toolResults: []
        }
      });
    }

  } catch (error) {
    console.error('Error in simplified AI SDK tool call:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
