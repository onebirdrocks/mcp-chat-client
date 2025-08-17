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

// 动态导入服务器端模块
let readFileSync: any, existsSync: any, join: any;
if (typeof window === 'undefined') {
  const fs = require('fs');
  const path = require('path');
  readFileSync = fs.readFileSync;
  existsSync = fs.existsSync;
  join = path.join;
}

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

// Read preset models from configuration file
function readPresetModels(): Record<string, Array<{ id: string; name: string; description: string }>> {
  // 在客户端环境中返回空对象
  if (typeof window !== 'undefined') {
    return {};
  }
  
  const OOBT_MODELS_FILE_PATH = join(process.cwd(), 'oobt-models.json');
  
  if (!existsSync || !existsSync(OOBT_MODELS_FILE_PATH)) {
    console.warn('oobt-models.json not found, using empty preset models');
    return {};
  }
  
  try {
    const content = readFileSync(OOBT_MODELS_FILE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to read oobt-models.json:', error);
    return {};
  }
}

// AI SDK model configurations (dynamically generated from file)
function generateAISDKModels() {
  const presetModels = readPresetModels();
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
  for (const [providerId, models] of Object.entries(presetModels)) {
    if (providers[providerId as keyof typeof providers]) {
      aiSdkModels[providerId] = {};
      for (const model of models) {
        aiSdkModels[providerId][model.id] = providers[providerId as keyof typeof providers](model.id);
      }
    }
  }
  
  return aiSdkModels;
}

const AI_SDK_MODELS = generateAISDKModels();

export class AISDKModelManager {
  private customModels: Map<string, any> = new Map();

  // Get AI SDK model instance
  getModel(providerId: string, modelId: string) {
    // First check custom models
    const customKey = `${providerId}:${modelId}`;
    if (this.customModels.has(customKey)) {
      return this.customModels.get(customKey);
    }

    // Then check preset models
    const providerModels = AI_SDK_MODELS[providerId as keyof typeof AI_SDK_MODELS];
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

  // Get model capabilities (if available)
  async getModelCapabilities(providerId: string, modelId: string): Promise<ModelInfo['capabilities']> {
    try {
      // Test with different types of prompts to determine capabilities
      const capabilities: ModelInfo['capabilities'] = {};

      // Test basic text generation
      const basicTest = await this.testModel(providerId, modelId, 'Who are you? Can you introduce yourself?');
      if (basicTest.success) {
        capabilities.supportsFunctionCalling = false; // Will be updated if function calling is tested
      }

      // Test with a longer prompt to check context length
      const longPrompt = 'A'.repeat(1000);
      const contextTest = await this.testModel(providerId, modelId, longPrompt);
      if (contextTest.success) {
        capabilities.contextLength = 4000; // Default assumption
      }

      return capabilities;
    } catch (error) {
      return {};
    }
  }

  // List available models for a provider using AI SDK
  async listModelsForProvider(providerId: string): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [];
    
    // Get preset models
    const providerModels = AI_SDK_MODELS[providerId as keyof typeof AI_SDK_MODELS];
    if (providerModels) {
      for (const [modelId, modelInstance] of Object.entries(providerModels)) {
        models.push({
          id: modelId,
          name: modelId,
          description: `Preset ${providerId} model`,
          providerId,
          isCustom: false,
          isEnabled: true,
          source: 'preset',
        });
      }
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
export const aiSDKModelManager = new AISDKModelManager();
