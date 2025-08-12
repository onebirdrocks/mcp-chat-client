import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import databaseManager from '@/lib/database-server';
import { generateSmartTitle } from '@/lib/title-generator';

// Get conversation by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await databaseManager.init();
    
    const conversation = await databaseManager.getConversation(id);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const messages = await databaseManager.getMessages(id);
    
    return NextResponse.json({
      ...conversation,
      messages
    });
  } catch (error: any) {
    console.error('Failed to get conversation:', error);
    return NextResponse.json(
      { error: 'Failed to get conversation', message: error.message },
      { status: 500 }
    );
  }
}

// Send message to conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { message, showReasoning } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    await databaseManager.init();
    
    const conversation = await databaseManager.getConversation(id);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    
    // Add user message
    const userMessageId = uuidv4();
    await databaseManager.addMessage({
      id: userMessageId,
      conversationId: id,
      role: 'user',
      content: message,
      timestamp: now
    });

    // Add assistant message placeholder
    const assistantMessageId = uuidv4();
    const assistantMessage = {
      id: assistantMessageId,
      conversationId: id,
      role: 'assistant' as const,
      content: '',
      timestamp: now
    };

    await databaseManager.addMessage(assistantMessage);

    // 获取对话的所有消息用于生成标题
    const allMessages = await databaseManager.getMessages(id);
    
    // 如果是第一条消息，自动生成标题
    if (allMessages.length === 2) { // 用户消息 + AI消息占位符
      const title = generateSmartTitle(allMessages);
      await databaseManager.updateConversationTitle(id, title);
    }

    return NextResponse.json({
      userMessage: {
        id: userMessageId,
        role: 'user',
        content: message,
        timestamp: now
      },
      assistantMessage: {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: now
      }
    });
  } catch (error: any) {
    console.error('Failed to send message:', error);
    return NextResponse.json(
      { error: 'Failed to send message', message: error.message },
      { status: 500 }
    );
  }
}

// Update conversation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title } = await request.json();
    
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    await databaseManager.init();
    
    const conversation = await databaseManager.getConversation(id);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    await databaseManager.updateConversationTitle(id, title);
    
    return NextResponse.json({
      message: 'Conversation updated successfully'
    });
  } catch (error: any) {
    console.error('Failed to update conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation', message: error.message },
      { status: 500 }
    );
  }
}

// Delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await databaseManager.init();
    
    const conversation = await databaseManager.getConversation(id);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    await databaseManager.deleteConversation(id);
    
    return NextResponse.json({
      message: 'Conversation deleted successfully'
    });
  } catch (error: any) {
    console.error('Failed to delete conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation', message: error.message },
      { status: 500 }
    );
  }
}
