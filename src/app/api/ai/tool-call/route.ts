import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
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
    const { providerId, modelId, prompt, tools, chatId, historyMessages } = await request.json();

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

    let result;
    
    // 构建包含历史消息的完整prompt
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
    
    // 添加当前消息
    fullPrompt += `User: ${prompt}\n`;
    fullPrompt += `Assistant:`;
    
    // 如果没有提供工具，直接生成响应
    if (!tools || tools.length === 0) {
      const response = await generateText({
        model,
        prompt: fullPrompt,
        temperature: 0.7
      });
      
      result = {
        text: response.text,
        toolCalls: []
      };
    } else {
      // 构建工具调用提示
      const toolCallPrompt = buildToolCallPrompt(fullPrompt, tools);
      
      // 让AI模型判断是否需要工具调用
      const response = await generateText({
        model,
        prompt: toolCallPrompt,
        temperature: 0.1
      });
      
      // 解析AI的响应
      result = parseToolCallResponse(response.text);
    }
    
    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error in AI tool call:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
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

// 构建工具调用提示
function buildToolCallPrompt(userPrompt: string, availableTools: any[]): string {
  const toolDescriptions = availableTools.map(tool => {
    const func = tool.function;
    return `- ${func.name}: ${func.description}
  参数: ${JSON.stringify(func.parameters, null, 2)}`;
  }).join('\n');

  return `你是一个智能助手，需要判断用户请求是否需要使用工具。

可用工具:
${toolDescriptions}

对话历史:
${userPrompt}

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
function parseToolCallResponse(response: string): { text: string; toolCalls: any[] } {
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
    const toolCalls = (parsed.toolCalls || []).map((toolCall: any, index: number) => ({
      id: `tool_${Date.now()}_${index}`,
      name: toolCall.name,
      arguments: toolCall.arguments || {},
      serverName: toolCall.serverName || getServerNameFromTool(toolCall.name)
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
function getServerNameFromTool(toolName: string): string {
  // 工具名称格式: "serverName:toolName"
  if (toolName.includes(':')) {
    return toolName.split(':')[0];
  }
  return 'unknown';
} 
