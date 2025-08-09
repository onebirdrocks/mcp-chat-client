import { NextResponse } from 'next/server';
import { withCors } from '@/lib/cors';
import { handleAsyncRoute, ValidationError } from '@/lib/errors';
import { getSessionManager } from '@/services/SessionManager';
import { LLMProvider } from '@/types';
import { ensureInitialized } from '@/lib/startup';

async function createSessionHandler(request: Request): Promise<NextResponse> {
  await ensureInitialized();
  
  const body = await request.json();
  const { provider, model, mcpServers, initialMessage } = body;

  if (!provider || !['openai', 'deepseek', 'openrouter'].includes(provider)) {
    throw new ValidationError('Valid provider is required (openai, deepseek, openrouter)');
  }

  if (!model || typeof model !== 'string') {
    throw new ValidationError('Model is required');
  }

  const sessionManager = getSessionManager();
  
  // Prepare initial message if provided
  let parsedInitialMessage;
  if (initialMessage) {
    parsedInitialMessage = {
      ...initialMessage,
      timestamp: initialMessage.timestamp ? new Date(initialMessage.timestamp) : new Date(),
    };
  }

  const session = await sessionManager.createSession(
    provider as LLMProvider,
    model,
    mcpServers || [],
    parsedInitialMessage
  );

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

async function getSessionsHandler(request: Request): Promise<NextResponse> {
  await ensureInitialized();
  
  const sessionManager = getSessionManager();
  const sessions = await sessionManager.getAllSessions();

  // Convert sessions to the format expected by frontend
  const formattedSessions = sessions.map(session => ({
    id: session.id,
    title: session.title,
    messages: session.messages,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    provider: session.provider,
    model: session.model,
    mcpServers: session.mcpServers,
  }));

  return NextResponse.json(formattedSessions);
}

export const GET = withCors(handleAsyncRoute(getSessionsHandler));
export const POST = withCors(handleAsyncRoute(createSessionHandler));
export const OPTIONS = withCors(async () => new NextResponse(null, { status: 200 }));