import { NextResponse } from 'next/server';
import { withCors } from '@/lib/cors';
import { handleAsyncRoute, ValidationError } from '@/lib/errors';
import { getSessionManager } from '@/services/SessionManager';
import { ensureInitialized } from '@/lib/startup';

interface RouteContext {
  params: {
    sessionId: string;
  };
}

async function addMessageHandler(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  await ensureInitialized();
  
  const { sessionId } = context.params;
  
  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  const body = await request.json();
  const { message } = body;

  if (!message || typeof message !== 'object') {
    throw new ValidationError('Message object is required');
  }

  // Validate message structure
  if (!message.id || typeof message.id !== 'string') {
    throw new ValidationError('Message must have a valid id');
  }

  if (!message.role || !['user', 'assistant', 'tool', 'system'].includes(message.role)) {
    throw new ValidationError('Message must have a valid role');
  }

  if (typeof message.content !== 'string') {
    throw new ValidationError('Message must have string content');
  }

  // Prepare message with timestamp
  const messageWithTimestamp = {
    ...message,
    timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
  };

  const sessionManager = getSessionManager();
  const updatedSession = await sessionManager.addMessage(sessionId, messageWithTimestamp);

  return NextResponse.json({
    sessionId: updatedSession.id,
    message: messageWithTimestamp,
    totalMessages: updatedSession.messages.length,
  });
}

export const POST = withCors(handleAsyncRoute(addMessageHandler));
export const OPTIONS = withCors(async () => new NextResponse(null, { status: 200 }));