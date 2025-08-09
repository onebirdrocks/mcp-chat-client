import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { ValidationError } from '@/lib/errors';
import { validateChatRequest } from '@/lib/validation';
import { ensureInitialized } from '@/lib/initialization';
import { ChatRequest, ChatResponse } from '@/types';
import { createLLMService, getDefaultProviderConfig } from '@/services/LLMService';
import { getSessionManager } from '@/services/SessionManager';
import { createChatProcessor } from '@/services/ChatProcessor';

async function chatHandler(request: Request): Promise<NextResponse> {
  if (request.method !== 'POST') {
    return NextResponse.json(
      { error: 'Method not allowed', sessionId: '', message: 'Only POST method is allowed' },
      { status: 405 }
    );
  }

  console.log('Processing chat request');

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

  // Note: API key is now retrieved securely from backend storage, not from frontend
  console.log('🔧 Backend received provider:', chatRequest.provider);
  console.log('🤖 Backend received model:', chatRequest.model);

  // Get API key from secure settings manager (never from frontend)
  let actualApiKey: string;
  try {
    const { getSecureSettingsManager } = await import('@/services/SecureSettingsManager');
    const settingsManager = getSecureSettingsManager();
    await settingsManager.initialize();
    
    // Find the provider configuration by matching provider name
    const settings = await settingsManager.getSettings();
    const provider = settings.llmProviders.find(p => p.name === chatRequest.provider && p.enabled);
    
    if (!provider) {
      throw new ValidationError(`No enabled ${chatRequest.provider} provider found. Please configure and enable a provider in settings.`);
    }
    
    actualApiKey = await settingsManager.getDecryptedApiKey(provider.id);
    console.log('🔑 Retrieved API key from secure storage for provider:', chatRequest.provider);
  } catch (error) {
    console.error('❌ Failed to retrieve API key from secure storage:', error);
    throw new ValidationError('API key not found in secure storage. Please configure your API key in settings.');
  }

  // Validate API key
  if (!actualApiKey || typeof actualApiKey !== 'string' || actualApiKey.trim().length === 0) {
    console.error('❌ API key validation failed: missing or empty');
    throw new ValidationError('API key is required for chat requests');
  }

  // Basic API key format validation
  if (actualApiKey.length < 10) {
    console.error('❌ API key validation failed: too short');
    throw new ValidationError('API key appears to be invalid (too short)');
  }

  try {
    // Create LLM service with user's configuration
    const defaultConfig = getDefaultProviderConfig(chatRequest.provider);
    const llmService = createLLMService({
      provider: chatRequest.provider,
      apiKey: actualApiKey,
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

    // Process the chat query
    const response = await chatProcessor.processQuery({
      messages: chatRequest.messages,
      sessionId: chatRequest.sessionId,
      provider: chatRequest.provider,
      model: chatRequest.model,
      availableTools: availableTools || [],
      systemPrompt,
      temperature,
      maxTokens,
    });

    const chatResponse: ChatResponse = {
      reply: response.reply,
      toolCalls: response.toolCalls,
      sessionId: response.sessionId,
    };

    console.log(`Chat request processed successfully for session: ${response.sessionId}`);
    return NextResponse.json(chatResponse);
  } catch (error) {
    console.error('Chat processing error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = error instanceof ValidationError ? 400 : 500;
    
    const chatResponse: ChatResponse = {
      sessionId: chatRequest.sessionId,
      error: errorMessage,
    };

    return NextResponse.json(chatResponse, { status: statusCode });
  }
}

export const POST = withSecurity(chatHandler);
export const OPTIONS = withSecurity(async () => new NextResponse(null, { status: 200 }));