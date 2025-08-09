import { NextRequest, NextResponse } from 'next/server';
import { getSecureSettingsManager } from '../../../../backend/src/services/SecureSettingsManager';
import { ValidationError } from '../../../../backend/src/lib/errors';

export const runtime = 'nodejs';

interface TestConnectionRequest {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  providerId?: string;
}

interface TestConnectionResponse {
  success: boolean;
  error?: string;
  models?: Array<{
    id: string;
    name: string;
    supportsToolCalling: boolean;
  }>;
  latency?: number;
  timestamp: string;
}

/**
 * POST /api/settings/test-connection - Test LLM provider connection
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: TestConnectionRequest = await request.json();
    const { provider, apiKey, baseUrl, providerId } = body;
    
    if (!provider) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Provider is required',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }
    
    const settingsManager = getSecureSettingsManager();
    await settingsManager.initialize();
    
    let testApiKey = apiKey;
    
    // If no API key provided but providerId is given, get from settings
    if (!testApiKey && providerId) {
      try {
        testApiKey = await settingsManager.getDecryptedApiKey(providerId);
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'API key not found for provider',
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }
    }
    
    if (!testApiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key is required for connection testing',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }
    
    // Validate API key format
    const isValidFormat = await settingsManager.validateApiKey(provider, testApiKey, baseUrl);
    if (!isValidFormat) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key format for provider',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }
    
    // Test the connection by making a simple API call
    const testResult = await testProviderConnection(provider, testApiKey, baseUrl);
    const latency = Date.now() - startTime;
    
    const response: TestConnectionResponse = {
      success: testResult.success,
      error: testResult.error,
      models: testResult.models,
      latency,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Connection test failed:', error);
    
    const latency = Date.now() - startTime;
    
    if (error instanceof ValidationError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        latency,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      latency,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Test connection to LLM provider
 */
async function testProviderConnection(
  provider: string, 
  apiKey: string, 
  baseUrl?: string
): Promise<{
  success: boolean;
  error?: string;
  models?: Array<{
    id: string;
    name: string;
    supportsToolCalling: boolean;
  }>;
}> {
  try {
    const providerBaseUrl = getProviderBaseUrl(provider, baseUrl);
    
    // Test with a simple models list request
    const response = await fetch(`${providerBaseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        // Use HTTP status if JSON parsing fails
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
    
    const data = await response.json();
    const models = parseModelsResponse(provider, data);
    
    return {
      success: true,
      models
    };
    
  } catch (error) {
    console.error(`Provider ${provider} connection test error:`, error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Connection timeout - please check your network and API endpoint'
        };
      }
      
      if (error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Network error - unable to reach API endpoint'
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: 'Unknown connection error'
    };
  }
}

/**
 * Get the base URL for a provider
 */
function getProviderBaseUrl(provider: string, customBaseUrl?: string): string {
  if (customBaseUrl) {
    return customBaseUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'deepseek':
      return 'https://api.deepseek.com/v1';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1';
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Parse models response based on provider
 */
function parseModelsResponse(provider: string, data: any): Array<{
  id: string;
  name: string;
  supportsToolCalling: boolean;
}> {
  if (!data.data || !Array.isArray(data.data)) {
    return [];
  }
  
  return data.data
    .filter((model: any) => model.id && typeof model.id === 'string')
    .map((model: any) => ({
      id: model.id,
      name: model.id, // Use ID as name by default
      supportsToolCalling: determineToolCallSupport(provider, model.id)
    }))
    .slice(0, 20); // Limit to first 20 models
}

/**
 * Determine if a model supports tool calling based on provider and model ID
 */
function determineToolCallSupport(provider: string, modelId: string): boolean {
  switch (provider) {
    case 'openai':
      return modelId.includes('gpt-4') || 
             modelId.includes('gpt-3.5-turbo') ||
             modelId.includes('gpt-4o');
    case 'deepseek':
      return modelId.includes('chat') || modelId.includes('coder');
    case 'openrouter':
      // OpenRouter models that support function calling
      return modelId.includes('gpt-4') || 
             modelId.includes('gpt-3.5-turbo') ||
             modelId.includes('claude') ||
             modelId.includes('deepseek');
    default:
      return false;
  }
}