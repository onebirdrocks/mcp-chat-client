import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { cohere } from '@ai-sdk/cohere';
import { perplexity } from '@ai-sdk/perplexity';
import { fireworks } from '@ai-sdk/fireworks';
import { groq } from '@ai-sdk/groq';
import { deepseek } from '@ai-sdk/deepseek';
import { openrouter } from '@openrouter/ai-sdk-provider';

export async function POST(request: NextRequest) {
  try {
    const { providerId, modelId, originalPrompt, toolResults, historyMessages } = await request.json();

    if (!providerId || !modelId || !originalPrompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: providerId, modelId, originalPrompt' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取模型实例
    const model = getModel(providerId, modelId);
    if (!model) {
      return new Response(
        JSON.stringify({ error: `Model not found: ${providerId}/${modelId}` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 构建包含历史消息和工具执行结果的完整prompt
    let fullPrompt = '';
    
    // 添加历史消息（如果提供）
    if (historyMessages && Array.isArray(historyMessages)) {
      for (const msg of historyMessages) {
        if (msg.role === 'user') {
          fullPrompt += `User: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          fullPrompt += `Assistant: ${msg.content}\n`;
        }
      }
    }
    
    // 添加原始用户请求
    fullPrompt += `User: ${originalPrompt}\n`;
    
    // 添加工具执行结果（如果有）
    if (toolResults && Array.isArray(toolResults) && toolResults.length > 0) {
      fullPrompt += `\n工具执行结果:\n`;
      for (const result of toolResults) {
        if (result.success) {
          fullPrompt += `✅ ${result.toolCallId}: 执行成功\n`;
          fullPrompt += `结果: ${JSON.stringify(result.result, null, 2)}\n\n`;
        } else {
          fullPrompt += `❌ ${result.toolCallId}: 执行失败\n`;
          fullPrompt += `错误: ${result.error}\n\n`;
        }
      }
    }
    
    fullPrompt += `Assistant: 基于工具执行结果，我来为您提供详细的回答。请使用 Markdown 格式来组织内容，包括：

- 使用 ## 作为二级标题
- 使用 ### 作为三级标题  
- 使用 - 或 * 创建无序列表
- 使用 1. 2. 3. 创建有序列表
- 使用 \`\`\` 创建代码块
- 使用 **粗体** 和 *斜体* 强调重要信息

现在开始回答：\n`;
    
    console.log('Starting tool call result stream with model:', modelId, 'provider:', providerId);
    
    const result = await streamText({
      model,
      prompt: fullPrompt,
      temperature: 0.7,
      maxTokens: 4000
    });

    // 手动创建SSE格式的响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            const data = JSON.stringify({ content: chunk });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
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

  } catch (error) {
    console.error('Error in AI tool call stream:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 获取模型实例
function getModel(providerId: string, modelId: string) {
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
