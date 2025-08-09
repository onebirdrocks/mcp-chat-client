import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { ValidationError } from '@/lib/errors';
import { getSecureSettingsManager } from '@/services/SecureSettingsManager';
import { testLLMProviderConnection } from '@/services/LLMService';

async function testConnectionHandler(request: Request): Promise<NextResponse> {
  if (request.method !== 'POST') {
    return NextResponse.json(
      { error: 'Method not allowed', message: 'Only POST method is allowed' },
      { status: 405 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body');
  }

  const { providerId } = body;

  if (!providerId || typeof providerId !== 'string') {
    throw new ValidationError('Provider ID is required');
  }

  try {
    const settingsManager = getSecureSettingsManager();
    await settingsManager.initialize();

    // Get the provider configuration
    const settings = await settingsManager.getSettings();
    const provider = settings.llmProviders.find(p => p.id === providerId);

    if (!provider) {
      throw new ValidationError('Provider not found');
    }

    if (!provider.enabled) {
      throw new ValidationError('Provider is disabled');
    }

    // Get the decrypted API key
    const apiKey = await settingsManager.getDecryptedApiKey(providerId);

    if (!apiKey) {
      throw new ValidationError('API key not configured for this provider');
    }

    // Test the connection
    const result = await testLLMProviderConnection({
      ...provider,
      apiKey,
    });

    return NextResponse.json({
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
    return NextResponse.json({
      success: false,
      error: errorMessage,
    });
  }
}

export const POST = withSecurity(testConnectionHandler);
export const OPTIONS = withSecurity(async () => new NextResponse(null, { status: 200 }));