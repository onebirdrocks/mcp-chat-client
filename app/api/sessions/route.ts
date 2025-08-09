import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '../../../backend/src/services/SessionManager';
import { ValidationError, NotFoundError } from '../../../backend/src/lib/errors';
import { ChatSession, Message } from '../../../lib/types';

export const runtime = 'nodejs';

interface CreateSessionRequest {
  provider: string;
  model: string;
  mcpServers?: string[];
  initialMessage?: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  };
  title?: string;
}

interface UpdateSessionRequest {
  title?: string;
  mcpServers?: string[];
  archived?: boolean;
}

/**
 * GET /api/sessions - Get all sessions (with optional filtering)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const sessionManager = getSessionManager();
    await sessionManager.initialize();
    
    const searchOptions = {
      provider: provider as any,
      limit: Math.min(Math.max(limit, 1), 100),
      offset: Math.max(offset, 0),
      sortBy: 'updatedAt' as const,
      sortOrder: 'desc' as const,
    };
    
    const result = await sessionManager.searchSessions(searchOptions);
    
    return NextResponse.json({
      success: true,
      data: {
        sessions: result.sessions,
        total: result.total,
        hasMore: result.hasMore,
      },
    });
    
  } catch (error) {
    console.error('Failed to get sessions:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve sessions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions - Create a new chat session
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateSessionRequest = await request.json();
    const { provider, model, mcpServers = [], initialMessage, title } = body;
    
    // Validate required fields
    if (!provider || !model) {
      return NextResponse.json(
        { success: false, error: 'Provider and model are required' },
        { status: 400 }
      );
    }
    
    // Validate provider
    const validProviders = ['openai', 'deepseek', 'openrouter'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider' },
        { status: 400 }
      );
    }
    
    const sessionManager = getSessionManager();
    await sessionManager.initialize();
    
    // Create initial message if provided
    let firstMessage: Message | undefined;
    if (initialMessage) {
      firstMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: initialMessage.role,
        content: initialMessage.content,
        timestamp: new Date(),
      };
    }
    
    // Create the session
    const session = await sessionManager.createSession(
      provider as any,
      model,
      mcpServers,
      firstMessage
    );
    
    // Update title if provided
    if (title && title.trim()) {
      await sessionManager.updateSession(session.id, { title: title.trim() });
      session.title = title.trim();
    }
    
    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
          createdAt: session.createdAt.toISOString(),
          updatedAt: session.updatedAt.toISOString(),
          provider: session.provider,
          model: session.model,
          mcpServers: session.mcpServers,
          messageCount: session.messages.length,
        },
      },
      message: 'Session created successfully',
    });
    
  } catch (error) {
    console.error('Failed to create session:', error);
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
}