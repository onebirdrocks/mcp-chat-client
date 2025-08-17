import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import databaseManager, { DEFAULT_MODEL_PARAMS } from '@/lib/database-server';

interface CreateChatRequest {
  providerId: string;
  modelId: string;
  modelName: string;
  providerName: string;
  title?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// Get all conversations
export async function GET() {
  try {
    // 确保数据库已初始化
    await databaseManager.init();
    
    const conversations = await databaseManager.getConversations();
    
    return NextResponse.json({
      chats: conversations,
      total: conversations.length
    });
  } catch (error: any) {
    console.error('Failed to get conversations:', error);
    return NextResponse.json(
      { error: 'Failed to get conversations', message: error.message },
      { status: 500 }
    );
  }
}

// Create new conversation
export async function POST(request: NextRequest) {
  try {
    const body: CreateChatRequest = await request.json();
    
    if (!body.providerId || !body.modelId || !body.modelName || !body.providerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // 确保数据库已初始化
    await databaseManager.init();
    
    const conversationId = uuidv4();
    const now = new Date().toISOString();
    
    const newConversation = {
      id: conversationId,
      title: body.title || `新对话 ${Date.now()}`,
      providerId: body.providerId,
      modelId: body.modelId,
      modelName: body.modelName,
      providerName: body.providerName,
      systemPrompt: body.systemPrompt || DEFAULT_MODEL_PARAMS.systemPrompt,
      temperature: body.temperature ?? DEFAULT_MODEL_PARAMS.temperature,
      maxTokens: body.maxTokens ?? DEFAULT_MODEL_PARAMS.maxTokens,
      topP: body.topP ?? DEFAULT_MODEL_PARAMS.topP,
      frequencyPenalty: body.frequencyPenalty ?? DEFAULT_MODEL_PARAMS.frequencyPenalty,
      presencePenalty: body.presencePenalty ?? DEFAULT_MODEL_PARAMS.presencePenalty,
      createdAt: now,
      updatedAt: now
    };

    await databaseManager.createConversation(newConversation);

    return NextResponse.json({
      chat: {
        ...newConversation,
        messageCount: 0
      },
      message: 'Conversation created successfully'
    });
  } catch (error: any) {
    console.error('Failed to create conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation', message: error.message },
      { status: 500 }
    );
  }
}
