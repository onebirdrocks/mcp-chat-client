import { NextResponse } from 'next/server';
import { withCors } from '@/lib/cors';
import { handleAsyncRoute, ValidationError } from '@/lib/errors';
import { validateChatRequest } from '@/lib/validation';
import { ensureInitialized } from '@/lib/initialization';
import { ChatRequest } from '@/types';
import { createLLMService, getDefaultProviderConfig } from '@/services/LLMService';
import { getSessionManager } from '@/services/SessionManager';
import { createChatProcessor } from '@/services/ChatProcessor';

async function streamChatHandler(request: Request): Promise<NextResponse> {
  if (request.method !== 'POST') {
    return NextResponse.json(
      { error: 'Method not allowed', message: 'Only POST method is allowed' },
      { status: 405 }
    );
  }

  // Ensure backend is initialized
  await ensureInitialized();

  const body = await request.json();
  const chatRequest = validateChatRequest(body);

  // Extract additional parameters from request body
  const { 
    apiKey, 
    baseUrl, 
    systemPrompt, 
    temperature, 
    maxTokens,
    availableTools 
  } = body;

  // Validate API key is provided
  if (!apiKey || typeof apiKey !== 'string') {
    throw new ValidationError('API key is required for chat requests');
  }

  try {
    // Create LLM service with user's configuration
    const defaultConfig = getDefaultProviderConfig(chatRequest.provider);
    const llmService = createLLMService({
      provider: chatRequest.provider,
      apiKey,
      baseUrl: baseUrl || defaultConfig.baseUrl,
      model: chatRequest.model,
      maxRetries: defaultConfig.maxRetries,
      retryDelay: defaultConfig.retryDelay,
      timeout: defaultConfig.timeout,
    });

    // Get session manager
    const sessionManager = getSessionManager();

    // Create chat processor
    const chatProcessor = createChatProcessor(llmService, sessionManager);

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Process the streaming query
          const responseGenerator = await chatProcessor.processStreamingQuery({
            messages: chatRequest.messages,
            sessionId: chatRequest.sessionId,
            provider: chatRequest.provider,
            model: chatRequest.model,
            availableTools: availableTools || [],
            systemPrompt,
            temperature,
            maxTokens,
          });

          // Stream the responses
          for await (const chunk of responseGenerator) {
            const data = JSON.stringify(chunk);
            const sseData = `data: ${data}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }

          // Send completion signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown streaming error',
            sessionId: chatRequest.sessionId,
            isStreaming: true,
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    // Return streaming response with appropriate headers
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Stream setup error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: errorMessage,
        sessionId: chatRequest.sessionId 
      },
      { status: error instanceof ValidationError ? 400 : 500 }
    );
  }
}

export const POST = withCors(handleAsyncRoute(streamChatHandler));
export const OPTIONS = withCors(async () => new NextResponse(null, { status: 200 }));