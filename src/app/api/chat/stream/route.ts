import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { AISDKModelManager } from '@/lib/ai-sdk-model-manager';
import databaseManager from '@/lib/database-server';
import { generateSmartTitle } from '@/lib/title-generator';

const aiSDKModelManager = new AISDKModelManager();

export async function POST(request: NextRequest) {
  try {
    const { chatId, message, providerId, modelId, showReasoning, assistantMessageId } = await request.json();

    if (!message || !providerId || !modelId || !chatId || !assistantMessageId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 确保数据库已初始化
    await databaseManager.init();

    // 获取对话信息以获取模型参数
    const conversation = await databaseManager.getConversation(chatId);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // 获取历史消息
    const historyMessages = await databaseManager.getMessages(chatId);
    
    const model = aiSDKModelManager.getModel(providerId, modelId);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    console.log('Starting stream with model:', modelId, 'provider:', providerId);
    console.log('History messages count:', historyMessages.length);
    
    // 构建完整的prompt，包含历史消息和system prompt
    let fullPrompt = '';
    
    // 添加system prompt
    if (conversation.systemPrompt) {
      fullPrompt += `${conversation.systemPrompt}\n\n`;
    }
    
    // 添加历史消息（排除当前用户消息，因为它还没有保存到数据库）
    for (const msg of historyMessages) {
      if (msg.role === 'user') {
        fullPrompt += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        fullPrompt += `Assistant: ${msg.content}\n`;
      }
    }
    
    // 添加当前用户消息
    fullPrompt += `User: ${message}\n`;
    fullPrompt += `Assistant:`;
    
    // 如果请求显示推理过程，在prompt中添加指令
    if (showReasoning) {
      fullPrompt = `${fullPrompt}\n\nPlease show your reasoning process step by step.`;
    } else if (modelId === 'deepseek-reasoner') {
      // DeepSeek Reasoner 默认会显示推理过程，不需要额外指令
    }
    
    const result = await streamText({
      model,
      prompt: fullPrompt,
      temperature: conversation.temperature,
    });

    console.log('Stream result type:', typeof result);
    console.log('Stream result methods:', Object.getOwnPropertyNames(result));

    // 手动创建SSE格式的响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let reasoningSteps: string[] = [];
          let fullContent = '';
          
          for await (const chunk of result.textStream) {
            // 更广泛的推理关键词检测，特别针对DeepSeek R1
            const reasoningKeywords = [
              'let me think', 'let me analyze', 'let me break this down',
              'step', 'reasoning', 'analysis', 'process',
              'first', 'second', 'third', 'finally',
              'therefore', 'thus', 'hence', 'consequently',
              'because', 'since', 'as a result',
              'let me explain', 'let me walk through',
              '思考', '分析', '推理', '步骤', '皮亚诺', '公理', '逐步', '证明', '推导'
            ];
            
            const isReasoningStep = reasoningKeywords.some(keyword => 
              chunk.toLowerCase().includes(keyword.toLowerCase())
            ) || 
            // DeepSeek Reasoner 特有的推理模式检测
            (modelId === 'deepseek-reasoner' && (
              chunk.includes('Thought:') || 
              chunk.includes('Thinking:') ||
              chunk.includes('Reasoning:') ||
              chunk.includes('Analysis:') ||
              /^\d+\./.test(chunk.trim()) || // 数字开头的步骤
              /^[•▪▫]\s/.test(chunk.trim()) || // 项目符号开头
              chunk.includes('皮亚诺') || // 数学推理
              chunk.includes('公理') || // 数学推理
              chunk.includes('推理') || // 中文推理
              chunk.includes('逐步') || // 逐步推理
              chunk.includes('证明') || // 数学证明
              chunk.includes('推导') // 数学推导
            ));
            
            if (isReasoningStep) {
              // 检查是否是新的推理步骤开始
              const isNewStep = chunk.includes('步骤') || 
                               chunk.includes('Step') || 
                               /^\d+\./.test(chunk.trim()) ||
                               chunk.includes('皮亚诺') ||
                               chunk.includes('公理');
              
              if (isNewStep && reasoningSteps.length > 0) {
                // 开始新的推理步骤
                reasoningSteps.push(chunk);
              } else if (reasoningSteps.length === 0) {
                // 第一个推理步骤
                reasoningSteps.push(chunk);
              } else {
                // 继续当前推理步骤
                reasoningSteps[reasoningSteps.length - 1] += chunk;
              }
            }
            
            fullContent += chunk;
            
            const data = `data: ${JSON.stringify({ 
              textDelta: chunk,
              isReasoning: isReasoningStep,
              reasoningSteps: reasoningSteps.length > 0 ? reasoningSteps : undefined
            })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          
          // 保存完整的AI回复到数据库
          try {
            await databaseManager.updateMessage(assistantMessageId, {
              content: fullContent,
              reasoningSteps: reasoningSteps.length > 0 ? JSON.stringify(reasoningSteps) : null
            });
            
            // 获取对话的所有消息，如果这是第一条AI回复，更新标题
            const allMessages = await databaseManager.getMessages(chatId);
            if (allMessages.length === 2) { // 只有一条用户消息和一条AI回复
              const title = generateSmartTitle(allMessages);
              await databaseManager.updateConversationTitle(chatId, title);
            }
          } catch (error) {
            console.error('Failed to save message to database:', error);
          }
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Streaming error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
