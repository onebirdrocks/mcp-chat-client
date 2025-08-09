import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '../../../backend/src/services/SessionManager';
import { ValidationError, NotFoundError } from '../../../backend/src/lib/errors';

export const runtime = 'nodejs';

interface ChatHistoryQuery {
  query?: string;
  provider?: string;
  limit?: string;
  offset?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

interface ChatHistoryResponse {
  sessions: Array<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
    provider: string;
    model: string;
  }>;
  total: number;
  hasMore: boolean;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

/**
 * GET /api/chat-history - Get chat session history with search and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query: ChatHistoryQuery = {
      query: searchParams.get('query') || undefined,
      provider: searchParams.get('provider') || undefined,
      limit: searchParams.get('limit') || '50',
      offset: searchParams.get('offset') || '0',
      sortBy: (searchParams.get('sortBy') as any) || 'updatedAt',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
    };
    
    // Validate parameters
    const limit = Math.min(Math.max(parseInt(query.limit || '50'), 1), 100);
    const offset = Math.max(parseInt(query.offset || '0'), 0);
    
    if (!['createdAt', 'updatedAt', 'title'].includes(query.sortBy || '')) {
      return NextResponse.json(
        { success: false, error: 'Invalid sortBy parameter' },
        { status: 400 }
      );
    }
    
    if (!['asc', 'desc'].includes(query.sortOrder || '')) {
      return NextResponse.json(
        { success: false, error: 'Invalid sortOrder parameter' },
        { status: 400 }
      );
    }
    
    const sessionManager = getSessionManager();
    await sessionManager.initialize();
    
    const searchOptions = {
      query: query.query,
      provider: query.provider as any,
      limit,
      offset,
      sortBy: query.sortBy as any,
      sortOrder: query.sortOrder as any,
    };
    
    const result = await sessionManager.searchSessions(searchOptions);
    
    const response: ChatHistoryResponse = {
      sessions: result.sessions,
      total: result.total,
      hasMore: result.hasMore,
      pagination: {
        limit,
        offset,
        total: result.total,
      },
    };
    
    return NextResponse.json({
      success: true,
      data: response,
    });
    
  } catch (error) {
    console.error('Failed to get chat history:', error);
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve chat history' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat-history - Bulk delete chat sessions
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionIds, olderThanDays, confirmed } = body;
    
    if (!confirmed) {
      return NextResponse.json(
        { success: false, error: 'Deletion must be confirmed' },
        { status: 400 }
      );
    }
    
    const sessionManager = getSessionManager();
    await sessionManager.initialize();
    
    let deletedCount = 0;
    
    if (sessionIds && Array.isArray(sessionIds)) {
      // Delete specific sessions
      for (const sessionId of sessionIds) {
        try {
          await sessionManager.deleteSession(sessionId);
          deletedCount++;
        } catch (error) {
          if (!(error instanceof NotFoundError)) {
            console.error(`Failed to delete session ${sessionId}:`, error);
          }
        }
      }
    } else if (olderThanDays && typeof olderThanDays === 'number') {
      // Delete sessions older than specified days
      const result = await sessionManager.secureCleanup({ 
        olderThanDays,
        clearAllSensitiveData: false 
      });
      deletedCount = result.deletedSessions;
    } else {
      return NextResponse.json(
        { success: false, error: 'Either sessionIds or olderThanDays must be provided' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        message: `Successfully deleted ${deletedCount} session(s)`,
      },
    });
    
  } catch (error) {
    console.error('Failed to delete chat history:', error);
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete chat history' },
      { status: 500 }
    );
  }
}