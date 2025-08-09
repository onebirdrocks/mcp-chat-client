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

async function generateTitleHandler(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  await ensureInitialized();
  
  const { sessionId } = context.params;
  
  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  const body = await request.json();
  const { provider, model, apiKey, baseUrl } = body;

  if (!provider || !model || !apiKey) {
    throw new ValidationError('Provider, model, and API key are required for title generation');
  }

  const sessionManager = getSessionManager();
  
  // Create LLM service for title generation
  let llmService;
  try {
    llmService = createLLMService({
      provider,
      model,
      apiKey,
      baseUrl,
    });
  } catch (error) {
    throw new ValidationError(`Failed to create LLM service: ${error}`);
  }

  const generatedTitle = await sessionManager.generateSessionTitle(sessionId, llmService);

  return NextResponse.json({
    sessionId,
    title: generatedTitle,
  });
}

export const POST = withCors(handleAsyncRoute(generateTitleHandler));
export const OPTIONS = withCors(async () => new NextResponse(null, { status: 200 }));