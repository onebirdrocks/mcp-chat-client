import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '../../../../../backend/src/services/SessionManager';
import { ValidationError, NotFoundError } from '../../../../../backend/src/lib/errors';
import { Message } from '../../../../../lib/types';

export const runtime = 'nodejs';

interface AddMessageRequest {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  toolCalls?: any[];
  toolCallId?: string;
  metadata?: {
    tokenCount?: number;
    processingTime?: number;
    model?: string;
    temperature?: number;
  };
}

/**
 * GET /api/sessions/[sessionId]/messages - Get messages for a session with pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const { searchParams } = new URL(request.url);
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    
    const sessionManager = getSessionManager();
    await sessionManager.initialize();
    
    const session = await sessionManager.getSession(sessionId);
    
    // Apply pagination to messages
    const totalMessages = session.messages.length;
    const paginatedMessages = session.messages
      .slice(offset, offset + limit)
      .map((message: any) => ({
        ...message,
        timestamp: message.timestamp.toISOString(),
      }));
    
    return NextResponse.json({
      success: true,
      data: {
        messages: paginatedMessages,
        pagination: {
          total: totalMessages,
          limit,
          offset,
          hasMore: offset + limit < totalMessages,
        },
        sessionInfo: {
          id: session.id,
          title: session.title,
          provider: session.provider,
          model: session.model,
        },
      },
    });
    
  } catch (error) {
    console.error(`Failed to get messages for session ${params.sessionId}:`, error);
    
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/[sessionId]/messages - Add a message to a session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body: AddMessageRequest = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Validate message data
    const { role, content, toolCalls, toolCallId, metadata } = body;
    
    if (!role || !content) {
      return NextResponse.json(
        { success: false, error: 'Role and content are required' },
        { status: 400 }
      );
    }
    
    if (!['user', 'assistant', 'tool', 'system'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid message role' },
        { status: 400 }
      );
    }
    
    if (typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Content must be a string' },
        { status: 400 }
      );
    }
    
    const sessionManager = getSessionManager();
    await sessionManager.initialize();
    
    // Create the message
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      toolCalls,
      toolCallId,
      metadata,
    };
    
    // Add message to session
    const updatedSession = await sessionManager.addMessage(sessionId, message);
    
    // Return the added message with serialized timestamp
    const serializedMessage = {
      ...message,
      timestamp: message.timestamp.toISOString(),
    };
    
    return NextResponse.json({
      success: true,
      data: {
        message: serializedMessage,
        sessionInfo: {
          id: updatedSession.id,
          title: updatedSession.title,
          messageCount: updatedSession.messages.length,
          updatedAt: updatedSession.updatedAt.toISOString(),
        },
      },
      message: 'Message added successfully',
    });
    
  } catch (error) {
    console.error(`Failed to add message to session ${params.sessionId}:`, error);
    
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to add message' },
      { status: 500 }
    );
  }
}