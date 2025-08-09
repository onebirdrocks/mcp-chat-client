import { NextResponse } from 'next/server';
import { withCors } from '@/lib/cors';
import { handleAsyncRoute, ValidationError } from '@/lib/errors';
import { ChatHistoryResponse, ChatSessionSummary, LLMProvider } from '@/types';
import { getSessionManager } from '@/services/SessionManager';
import { ensureInitialized } from '@/lib/startup';

async function getChatHistoryHandler(request: Request): Promise<NextResponse> {
  await ensureInitialized();
  
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const query = url.searchParams.get('query') || undefined;
  const provider = url.searchParams.get('provider') as LLMProvider || undefined;
  const sortBy = url.searchParams.get('sortBy') as 'createdAt' | 'updatedAt' | 'title' || 'updatedAt';
  const sortOrder = url.searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';

  // Validate parameters
  if (limit < 1 || limit > 100) {
    throw new ValidationError('Limit must be between 1 and 100');
  }
  if (offset < 0) {
    throw new ValidationError('Offset must be non-negative');
  }

  const sessionManager = getSessionManager();
  const result = await sessionManager.searchSessions({
    query,
    provider,
    limit,
    offset,
    sortBy,
    sortOrder,
  });

  return NextResponse.json({
    sessions: result.sessions,
    total: result.total,
    hasMore: result.hasMore,
  });
}

async function deleteChatHistoryHandler(request: Request): Promise<NextResponse> {
  await ensureInitialized();
  
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    throw new ValidationError('Missing sessionId parameter');
  }

  const sessionManager = getSessionManager();
  await sessionManager.deleteSession(sessionId);

  return NextResponse.json({ success: true });
}

async function updateChatHistoryHandler(request: Request): Promise<NextResponse> {
  await ensureInitialized();
  
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    throw new ValidationError('Missing sessionId parameter');
  }

  const body = await request.json();
  const { title } = body;

  if (!title || typeof title !== 'string') {
    throw new ValidationError('Title must be a non-empty string');
  }

  const sessionManager = getSessionManager();
  const updatedSession = await sessionManager.updateSession(sessionId, { title });

  return NextResponse.json({
    id: updatedSession.id,
    title: updatedSession.title,
    updatedAt: updatedSession.updatedAt.toISOString(),
  });
}

export const GET = withCors(handleAsyncRoute(getChatHistoryHandler));
export const DELETE = withCors(handleAsyncRoute(deleteChatHistoryHandler));
export const PUT = withCors(handleAsyncRoute(updateChatHistoryHandler));
export const OPTIONS = withCors(async () => new NextResponse(null, { status: 200 }));