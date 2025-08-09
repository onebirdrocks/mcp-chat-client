import { NextRequest, NextResponse } from 'next/server';
import { getSecureSettingsManager } from '../../../../backend/src/services/SecureSettingsManager';
import { getLLMService } from '../../../../lib/services';
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
    
    // Test the connection using LLM service
    const testResult = await testProviderConnectionWithLLMService(providerId || provider, provider, testApiKey, baseUrl);
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
 * Test connection to LLM provider using LLM service
 */
async function testProviderConnectionWithLLMService(
  providerId: string,
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
    // Create a temporary provider configuration for testing
    const settingsManager = getSecureSettingsManager();
    const currentSettings = await settingsManager.getSettings();
    
    // Check if provider already exists or create temporary one
    let testProviderId = providerId;
    const existingProvider = currentSettings.llmProviders.find(p => p.id === providerId);
    
    if (!existingProvider) {
      // Create temporary provider configuration for testing
      testProviderId = `test-${provider}-${Date.now()}`;
      const tempProvider = {
        id: testProviderId,
        name: provider,
        apiKey: apiKey,
        baseUrl: baseUrl || getProviderBaseUrl(provider),
        models: [],
        enabled: true
      };
      
      // Temporarily add provider to settings
      await settingsManager.updateSettings({
        llmProviders: [...currentSettings.llmProviders, tempProvider]
      });
    }
    
    try {
      // Use LLM service to test connection
      const llmService = getLLMService();
      await llmService.initialize();
      
      const result = await llmService.testConnection(testProviderId);
      
      // Clean up temporary provider if created
      if (!existingProvider) {
        const updatedSettings = await settingsManager.getSettings();
        const filteredProviders = updatedSettings.llmProviders.filter(p => p.id !== testProviderId);
        await settingsManager.updateSettings({
          llmProviders: filteredProviders
        });
      }
      
      if (result.success && result.models) {
        return {
          success: true,
          models: result.models.map(model => ({
            id: model.id,
            name: model.displayName || model.name,
            supportsToolCalling: model.supportsToolCalling
          }))
        };
      } else {
        return {
          success: false,
          error: result.error || 'Connection test failed'
        };
      }
      
    } catch (llmError) {
      // Clean up temporary provider if created
      if (!existingProvider) {
        try {
          const updatedSettings = await settingsManager.getSettings();
          const filteredProviders = updatedSettings.llmProviders.filter(p => p.id !== testProviderId);
          await settingsManager.updateSettings({
            llmProviders: filteredProviders
          });
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary provider:', cleanupError);
        }
      }
      throw llmError;
    }
    
  } catch (error) {
    console.error(`Provider ${provider} connection test error:`, error);
    
    if (error instanceof ValidationError) {
      return {
        success: false,
        error: error.message
      };
    }
    
    if (error instanceof Error) {
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