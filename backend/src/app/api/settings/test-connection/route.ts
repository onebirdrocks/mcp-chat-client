import { NextRequest, NextResponse } from 'next/server';
import { getSecureSettingsManager } from '@/services/SecureSettingsManager';
import { ValidationError } from '@/lib/errors';

export const runtime = 'nodejs';

/**
 * POST /api/settings/test-connection - Test LLM provider connection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, baseUrl } = body;

    if (!provider || typeof provider !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Provider is required' },
        { status: 400 }
      );
    }

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    const settingsManager = getSecureSettingsManager();
    await settingsManager.initialize();

    // Validate API key format
    const isValid = await settingsManager.validateApiKey(provider, apiKey);
    
    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: `Invalid API key format for ${provider}`,
        details: {
          provider,
          valid: false,
          reason: 'Invalid format',
        },
      }, { status: 400 });
    }

    // For now, we only validate the format
    // In a full implementation, this would make an actual API call to test the connection
    return NextResponse.json({
      success: true,
      message: 'API key format is valid',
      details: {
        provider,
        valid: true,
        baseUrl: baseUrl || 'default',
        tested: false, // Indicates we only validated format, not actual connection
      },
    });

  } catch (error) {
    console.error('Failed to test connection:', error);
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to test connection' },
      { status: 500 }
    );
  }
}