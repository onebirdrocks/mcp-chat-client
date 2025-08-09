import { NextResponse } from 'next/server';
import { withCors } from '@/lib/cors';
import { handleAsyncRoute, ValidationError } from '@/lib/errors';
import { getSessionManager } from '@/services/SessionManager';
import { createLLMService } from '@/services/LLMService';
import { ensureInitialized } from '@/lib/startup';

interface RouteContext {
  params: {
    sessionId: string;
  };
}

async function getSessionHandler(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  await ensureInitialized();
  
  const { sessionId } = context.params;
  
  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  const sessionManager = getSessionManager();
  const session = await sessionManager.getSession(sessionId);

  return NextResponse.json({
    id: session.id,
    title: session.title,
    messages: session.messages,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    provider: session.provider,
    model: session.model,
    mcpServers: session.mcpServers,
  });
}

async function updateSessionHandler(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  await ensureInitialized();
  
  const { sessionId } = context.params;
  
  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  const body = await request.json();
  const { title, messages } = body;

  const updates: any = {};
  if (title !== undefined) {
    if (typeof title !== 'string') {
      throw new ValidationError('Title must be a string');
    }
    updates.title = title;
  }

  if (messages !== undefined) {
    if (!Array.isArray(messages)) {
      throw new ValidationError('Messages must be an array');
    }
    updates.messages = messages.map((msg: any) => ({
      ...msg,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
    }));
  }

  const sessionManager = getSessionManager();
  const updatedSession = await sessionManager.updateSession(sessionId, updates);

  return NextResponse.json({
    id: updatedSession.id,
    title: updatedSession.title,
    messages: updatedSession.messages,
    createdAt: updatedSession.createdAt.toISOString(),
    updatedAt: updatedSession.updatedAt.toISOString(),
    provider: updatedSession.provider,
    model: updatedSession.model,
    mcpServers: updatedSession.mcpServers,
  });
}

async function deleteSessionHandler(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  await ensureInitialized();
  
  const { sessionId } = context.params;
  
  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  const sessionManager = getSessionManager();
  await sessionManager.deleteSession(sessionId);

  return NextResponse.json({ success: true });
}

export const GET = withCors(handleAsyncRoute(getSessionHandler));
export const PUT = withCors(handleAsyncRoute(updateSessionHandler));
export const DELETE = withCors(handleAsyncRoute(deleteSessionHandler));
export const OPTIONS = withCors(async () => new NextResponse(null, { status: 200 }));