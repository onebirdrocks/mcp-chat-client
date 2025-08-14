import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { cohere } from '@ai-sdk/cohere';
import { perplexity } from '@ai-sdk/perplexity';
import { fireworks } from '@ai-sdk/fireworks';
import { groq } from '@ai-sdk/groq';
import { deepseek } from '@ai-sdk/deepseek';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  providerId: string;
  isCustom: boolean;
  isEnabled: boolean;
  createdAt?: string;
  source: 'preset' | 'api' | 'custom';
  capabilities?: {
    supportsVision?: boolean;
    supportsFunctionCalling?: boolean;
    maxTokens?: number;
    contextLength?: number;
  };
}

export interface ModelTestResult {
  success: boolean;
  response?: string;
  error?: string;
  latency?: number;
  tokensUsed?: number;
}

// 客户端安全的预设模型
const CLIENT_PRESET_MODELS: Record<string, Array<{ id: string; name: string; description: string; capabilities?: any }>> = {
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'Latest GPT-4 model with improved performance',
      capabilities: {
        supportsTools: true,
        supportsFunctionCalling: true,
        maxTokens: 4096,
        contextLength: 128000
      }
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Fast and efficient GPT-4 model',
      capabilities: {
        supportsTools: true,
        supportsFunctionCalling: true,
        maxTokens: 4096,
        contextLength: 128000
      }
    }
  ],
  anthropic: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      description: 'Latest Claude model with improved capabilities',
      capabilities: {
        supportsTools: true,
        supportsFunctionCalling: true,
        maxTokens: 4096,
        contextLength: 200000
      }
    }
  ],
  deepseek: [
    {
      id: 'deepseek-reasoner',
      name: 'DeepSeek Reasoner',
      description: 'Reasoning-focused DeepSeek model',
      capabilities: {
        supportsTools: false,
        supportsFunctionCalling: false,
        maxTokens: 4096,
        contextLength: 32768
      }
    }
  ]
};

// AI SDK model configurations for client
function generateClientAISDKModels() {
  const aiSdkModels: Record<string, Record<string, any>> = {};
  
  // AI SDK provider functions mapping
  const providers = {
    openai,
    anthropic,
    google,
    mistral,
    cohere,
    perplexity,
    fireworks,
    groq,
    deepseek,
    openrouter
  };
  
  // Generate AI SDK models for each provider
  for (const [providerId, models] of Object.entries(CLIENT_PRESET_MODELS)) {
    if (providers[providerId as keyof typeof providers]) {
      aiSdkModels[providerId] = {};
      for (const model of models) {
        aiSdkModels[providerId][model.id] = providers[providerId as keyof typeof providers](model.id);
      }
    }
  }
  
  return aiSdkModels;
}

const CLIENT_AI_SDK_MODELS = generateClientAISDKModels();

export class AISDKModelManagerClient {
  private customModels: Map<string, any> = new Map();

  // Get AI SDK model instance
  getModel(providerId: string, modelId: string) {
    // First check custom models
    const customKey = `${providerId}:${modelId}`;
    if (this.customModels.has(customKey)) {
      return this.customModels.get(customKey);
    }

    // Then check preset models
    const providerModels = CLIENT_AI_SDK_MODELS[providerId as keyof typeof CLIENT_AI_SDK_MODELS];
    if (providerModels && providerModels[modelId as keyof typeof providerModels]) {
      return providerModels[modelId as keyof typeof providerModels];
    }

    // If not found, create a dynamic model instance
    return this.createDynamicModel(providerId, modelId);
  }

  // Create dynamic model instance for custom models
  private createDynamicModel(providerId: string, modelId: string) {
    switch (providerId) {
      case 'openai':
        return openai(modelId);
      case 'anthropic':
        return anthropic(modelId);
      case 'google':
        return google(modelId);
      case 'mistral':
        return mistral(modelId);
      case 'cohere':
        return cohere(modelId);
      case 'perplexity':
        return perplexity(modelId);
      case 'fireworks':
        return fireworks(modelId);
      case 'groq':
        return groq(modelId);
      case 'deepseek':
        return deepseek(modelId);
      case 'openrouter':
        return openrouter(modelId);
      default:
        throw new Error(`Unsupported provider: ${providerId}`);
    }
  }

  // Register custom model
  registerCustomModel(providerId: string, modelId: string, modelInstance: any) {
    const key = `${providerId}:${modelId}`;
    this.customModels.set(key, modelInstance);
  }

  // Test model with AI SDK
  async testModel(providerId: string, modelId: string, testPrompt: string = 'Who are you? Can you introduce yourself?'): Promise<ModelTestResult> {
    const startTime = Date.now();
    
    try {
      const model = this.getModel(providerId, modelId);
      
      const result = await generateText({
        model,
        prompt: testPrompt,
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      return {
        success: true,
        response: result.text,
        latency,
        tokensUsed: result.usage?.totalTokens,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        latency: Date.now() - startTime,
      };
    }
  }

  // Get model capabilities
  async getModelCapabilities(providerId: string, modelId: string): Promise<ModelInfo['capabilities']> {
    try {
      // Check preset models for capabilities
      const presetModels = CLIENT_PRESET_MODELS[providerId] || [];
      const model = presetModels.find(m => m.id === modelId);
      
      if (model?.capabilities) {
        return model.capabilities;
      }

      // Default capabilities
      return {
        supportsFunctionCalling: false,
        maxTokens: 4096,
        contextLength: 4000
      };
    } catch (error) {
      return {};
    }
  }

  // List available models for a provider
  async listModelsForProvider(providerId: string): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [];
    
    // Get preset models
    const presetModels = CLIENT_PRESET_MODELS[providerId] || [];
    for (const model of presetModels) {
      models.push({
        id: model.id,
        name: model.name,
        description: model.description,
        providerId,
        isCustom: false,
        isEnabled: true,
        source: 'preset',
        capabilities: model.capabilities
      });
    }

    // Get custom models
    for (const [key, modelInstance] of this.customModels.entries()) {
      const [customProviderId, modelId] = key.split(':');
      if (customProviderId === providerId) {
        models.push({
          id: modelId,
          name: modelId,
          description: `Custom ${providerId} model`,
          providerId: customProviderId,
          isCustom: true,
          isEnabled: true,
          source: 'custom',
        });
      }
    }

    return models;
  }

  // Batch test multiple models
  async batchTestModels(models: Array<{ providerId: string; modelId: string }>): Promise<Map<string, ModelTestResult>> {
    const results = new Map<string, ModelTestResult>();
    
    // Test models in parallel with a limit to avoid rate limiting
    const batchSize = 3;
    for (let i = 0; i < models.length; i += batchSize) {
      const batch = models.slice(i, i + batchSize);
      const batchPromises = batch.map(async ({ providerId, modelId }) => {
        const key = `${providerId}:${modelId}`;
        const result = await this.testModel(providerId, modelId);
        return { key, result };
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ key, result }) => {
        results.set(key, result);
      });
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < models.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  // Get model statistics
  async getModelStats(providerId: string, modelId: string): Promise<{
    avgLatency: number;
    successRate: number;
    totalTests: number;
  }> {
    // This would typically come from a database of test results
    // For now, return mock data
    return {
      avgLatency: 500,
      successRate: 0.95,
      totalTests: 10,
    };
  }

  // Compare models
  async compareModels(models: Array<{ providerId: string; modelId: string }>): Promise<{
    [key: string]: {
      latency: number;
      success: boolean;
      responseLength: number;
    };
  }> {
    const results: any = {};
    
    for (const { providerId, modelId } of models) {
      const key = `${providerId}:${modelId}`;
      const testResult = await this.testModel(providerId, modelId);
      
      results[key] = {
        latency: testResult.latency || 0,
        success: testResult.success,
        responseLength: testResult.response?.length || 0,
      };
    }
    
    return results;
  }
}

// Singleton instance
export const aiSDKModelManagerClient = new AISDKModelManagerClient();
