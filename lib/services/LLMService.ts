import OpenAI from 'openai';
import { Message, ToolCall, TokenUsage, ModelInfo } from '../types';

// Simple error classes for now
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class InternalServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InternalServerError';
  }
}

export interface LLMChatRequest {
  messages: Message[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  stream?: boolean;
}

export interface LLMChatResponse {
  content?: string;
  toolCalls?: ToolCall[];
  usage?: TokenUsage;
  finishReason?: string;
  model?: string;
}

export interface LLMStreamChunk {
  content?: string;
  toolCalls?: ToolCall[];
  usage?: TokenUsage;
  finishReason?: string;
  done: boolean;
}

export interface LLMProviderCapabilities {
  supportsStreaming: boolean;
  supportsToolCalling: boolean;
  maxTokens: number;
  supportedModels: string[];
}

export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

export type LLMProvider = 'openai' | 'deepseek' | 'openrouter';

/**
 * Unified LLM Service that abstracts different LLM providers
 * Handles API key management, streaming, error handling, and cost tracking
 */
export class LLMService {
  private clients: Map<string, OpenAI> = new Map();
  private settingsManager = {
    getSettings: async () => ({ llmProviders: [] }),
    initialize: async () => {},
  };

  constructor() {
    // Initialize will be called when needed
  }

  /**
   * Initialize the service and load provider configurations
   */
  async initialize(): Promise<void> {
    await this.settingsManager.initialize();
    await this.refreshClients();
  }

  /**
   * Send a chat completion request to the specified provider
   */
  async chat(providerId: string, request: LLMChatRequest): Promise<LLMChatResponse> {
    try {
      const client = await this.getClient(providerId);
      const provider = await this.getProviderConfig(providerId);
      
      if (!provider) {
        throw new ValidationError(`Provider not found: ${providerId}`);
      }

      // Convert our message format to OpenAI format
      const openAIMessages = this.convertMessagesToOpenAI(request.messages);
      
      // Prepare the request
      const chatRequest: OpenAI.Chat.ChatCompletionCreateParams = {
        model: request.model,
        messages: openAIMessages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        tools: request.tools,
        stream: false, // Non-streaming version
      };

      const startTime = Date.now();
      const response = await client.chat.completions.create(chatRequest);
      const processingTime = Date.now() - startTime;

      // Extract response data
      const choice = response.choices[0];
      const usage = response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined;

      // Handle tool calls
      let toolCalls: ToolCall[] | undefined;
      if (choice.message.tool_calls) {
        toolCalls = choice.message.tool_calls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
          serverId: this.extractServerIdFromToolName(tc.function.name),
        }));
      }

      return {
        content: choice.message.content || undefined,
        toolCalls,
        usage,
        finishReason: choice.finish_reason || undefined,
        model: response.model,
      };
    } catch (error) {
      console.error(`LLM chat error for provider ${providerId}:`, error);
      throw this.handleLLMError(error, providerId);
    }
  }

  /**
   * Send a streaming chat completion request
   */
  async *chatStream(providerId: string, request: LLMChatRequest): AsyncGenerator<LLMStreamChunk> {
    try {
      const client = await this.getClient(providerId);
      const provider = await this.getProviderConfig(providerId);
      
      if (!provider) {
        throw new ValidationError(`Provider not found: ${providerId}`);
      }

      // Convert our message format to OpenAI format
      const openAIMessages = this.convertMessagesToOpenAI(request.messages);
      
      // Prepare the streaming request
      const chatRequest: OpenAI.Chat.ChatCompletionCreateParams = {
        model: request.model,
        messages: openAIMessages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        tools: request.tools,
        stream: true,
      };

      const stream = await client.chat.completions.create(chatRequest);
      
      let accumulatedContent = '';
      let accumulatedToolCalls: ToolCall[] = [];
      let finalUsage: TokenUsage | undefined;

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        
        if (!choice) continue;

        const delta = choice.delta;
        let chunkContent: string | undefined;
        let chunkToolCalls: ToolCall[] | undefined;

        // Handle content delta
        if (delta.content) {
          accumulatedContent += delta.content;
          chunkContent = delta.content;
        }

        // Handle tool calls delta
        if (delta.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            const index = toolCallDelta.index || 0;
            
            // Initialize tool call if needed
            if (!accumulatedToolCalls[index]) {
              accumulatedToolCalls[index] = {
                id: toolCallDelta.id || '',
                type: 'function',
                function: {
                  name: '',
                  arguments: '',
                },
                serverId: '',
              };
            }

            // Update tool call data
            if (toolCallDelta.id) {
              accumulatedToolCalls[index].id = toolCallDelta.id;
            }
            if (toolCallDelta.function?.name) {
              accumulatedToolCalls[index].function.name = toolCallDelta.function.name;
              accumulatedToolCalls[index].serverId = this.extractServerIdFromToolName(toolCallDelta.function.name);
            }
            if (toolCallDelta.function?.arguments) {
              accumulatedToolCalls[index].function.arguments += toolCallDelta.function.arguments;
            }
          }
          chunkToolCalls = [...accumulatedToolCalls];
        }

        // Handle usage (usually in the last chunk)
        if (chunk.usage) {
          finalUsage = {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          };
        }

        const isFinished = choice.finish_reason !== null;

        yield {
          content: chunkContent,
          toolCalls: chunkToolCalls,
          usage: finalUsage,
          finishReason: choice.finish_reason || undefined,
          done: isFinished,
        };

        if (isFinished) break;
      }
    } catch (error) {
      console.error(`LLM streaming error for provider ${providerId}:`, error);
      throw this.handleLLMError(error, providerId);
    }
  }

  /**
   * Test connection to a provider
   */
  async testConnection(providerId: string): Promise<{ success: boolean; error?: string; models?: ModelInfo[] }> {
    try {
      const client = await this.getClient(providerId);
      
      // Test with a simple completion
      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo', // Use a common model for testing
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });

      // Try to list models if supported
      let models: ModelInfo[] | undefined;
      try {
        const modelsResponse = await client.models.list();
        models = modelsResponse.data
          .filter(model => model.id.includes('gpt') || model.id.includes('chat'))
          .map(model => ({
            id: model.id,
            name: model.id,
            displayName: model.id,
            supportsToolCalling: this.modelSupportsToolCalling(model.id),
            maxTokens: this.getModelMaxTokens(model.id),
          }));
      } catch (modelsError) {
        // Models endpoint might not be available for all providers
        console.warn(`Could not fetch models for ${providerId}:`, modelsError);
      }

      return {
        success: true,
        models,
      };
    } catch (error) {
      console.error(`Connection test failed for provider ${providerId}:`, error);
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Get available models for a provider
   */
  async getAvailableModels(providerId: string): Promise<ModelInfo[]> {
    const provider = await this.getProviderConfig(providerId);
    if (!provider) {
      throw new ValidationError(`Provider not found: ${providerId}`);
    }

    return provider.models;
  }

  /**
   * Get provider capabilities
   */
  async getProviderCapabilities(providerId: string): Promise<LLMProviderCapabilities> {
    const provider = await this.getProviderConfig(providerId);
    if (!provider) {
      throw new ValidationError(`Provider not found: ${providerId}`);
    }

    const providerType = provider.name;
    
    return {
      supportsStreaming: true, // All supported providers support streaming
      supportsToolCalling: true, // All supported providers support tool calling
      maxTokens: this.getProviderMaxTokens(providerType),
      supportedModels: provider.models.map(m => m.id),
    };
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(providerId: string, model: string, usage: TokenUsage): CostEstimate {
    const pricing = this.getModelPricing(providerId, model);
    
    const inputCost = (usage.promptTokens / 1000) * pricing.inputPer1k;
    const outputCost = (usage.completionTokens / 1000) * pricing.outputPer1k;
    const totalCost = inputCost + outputCost;

    return {
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      inputCost,
      outputCost,
      totalCost,
      currency: 'USD',
    };
  }

  /**
   * Refresh all provider clients (call when settings change)
   */
  async refreshClients(): Promise<void> {
    this.clients.clear();
    // Clients will be created lazily when needed
  }

  // Private methods

  private async getClient(providerId: string): Promise<OpenAI> {
    if (this.clients.has(providerId)) {
      return this.clients.get(providerId)!;
    }

    const provider = await this.getProviderConfig(providerId);
    if (!provider) {
      throw new ValidationError(`Provider configuration not found: ${providerId}`);
    }

    const apiKey = await this.settingsManager.getDecryptedApiKey(providerId);
    if (!apiKey) {
      throw new ValidationError(`API key not configured for provider: ${providerId}`);
    }

    const client = new OpenAI({
      apiKey,
      baseURL: provider.baseUrl,
    });

    this.clients.set(providerId, client);
    return client;
  }

  private async getProviderConfig(providerId: string) {
    const settings = await this.settingsManager.getSettings();
    return settings.llmProviders.find(p => p.id === providerId);
  }

  private convertMessagesToOpenAI(messages: Message[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map(msg => {
      switch (msg.role) {
        case 'user':
          return { role: 'user', content: msg.content };
        case 'assistant':
          const assistantMsg: OpenAI.Chat.ChatCompletionAssistantMessageParam = {
            role: 'assistant',
            content: msg.content,
          };
          if (msg.toolCalls) {
            assistantMsg.tool_calls = msg.toolCalls.map(tc => ({
              id: tc.id,
              type: 'function',
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments,
              },
            }));
          }
          return assistantMsg;
        case 'tool':
          return {
            role: 'tool',
            content: msg.content,
            tool_call_id: msg.toolCallId || '',
          };
        case 'system':
          return { role: 'system', content: msg.content };
        default:
          return { role: 'user', content: msg.content };
      }
    });
  }

  private extractServerIdFromToolName(toolName: string): string {
    const parts = toolName.split('.');
    return parts.length > 1 ? parts[0] : '';
  }

  private handleLLMError(error: any, providerId: string): Error {
    // If it's already a ValidationError or InternalServerError, re-throw it
    if (error instanceof ValidationError || error instanceof InternalServerError) {
      return error;
    }
    
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return new ValidationError(`Invalid API key for provider: ${providerId}`);
      } else if (error.status === 429) {
        return new ValidationError(`Rate limit exceeded for provider: ${providerId}`);
      } else if (error.status === 400) {
        return new ValidationError(`Invalid request to provider ${providerId}: ${error.message}`);
      }
      return new InternalServerError(`LLM API error for ${providerId}: ${error.message}`);
    }
    
    if (error instanceof Error) {
      return new InternalServerError(`LLM service error for ${providerId}: ${error.message}`);
    }
    
    return new InternalServerError(`Unknown LLM error for provider: ${providerId}`);
  }

  private getErrorMessage(error: any): string {
    if (error instanceof OpenAI.APIError) {
      return error.message || 'API Error';
    }
    if (error instanceof Error) {
      return error.message;
    }
    if (error && typeof error === 'object' && error.message) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  private modelSupportsToolCalling(modelId: string): boolean {
    // Define which models support tool calling
    const toolCallingModels = [
      'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo',
      'deepseek-chat', 'deepseek-coder',
    ];
    
    return toolCallingModels.some(model => modelId.includes(model));
  }

  private getModelMaxTokens(modelId: string): number {
    // Define max tokens for different models
    if (modelId.includes('gpt-4')) return 8192;
    if (modelId.includes('gpt-3.5')) return 4096;
    if (modelId.includes('deepseek')) return 4096;
    return 4096; // Default
  }

  private getProviderMaxTokens(provider: string): number {
    switch (provider) {
      case 'openai': return 128000; // GPT-4 Turbo
      case 'deepseek': return 32768;
      case 'openrouter': return 128000; // Depends on model
      default: return 4096;
    }
  }

  private getModelPricing(providerId: string, model: string): { inputPer1k: number; outputPer1k: number } {
    // Pricing data (as of 2024, in USD per 1k tokens)
    const pricing: Record<string, { inputPer1k: number; outputPer1k: number }> = {
      'gpt-4': { inputPer1k: 0.03, outputPer1k: 0.06 },
      'gpt-4-turbo': { inputPer1k: 0.01, outputPer1k: 0.03 },
      'gpt-3.5-turbo': { inputPer1k: 0.001, outputPer1k: 0.002 },
      'deepseek-chat': { inputPer1k: 0.0014, outputPer1k: 0.0028 },
      'deepseek-coder': { inputPer1k: 0.0014, outputPer1k: 0.0028 },
    };

    // Find pricing by model name
    for (const [modelName, price] of Object.entries(pricing)) {
      if (model.includes(modelName)) {
        return price;
      }
    }

    // Default pricing
    return { inputPer1k: 0.001, outputPer1k: 0.002 };
  }
}

// Singleton instance
let llmServiceInstance: LLMService | null = null;

export function getLLMService(): LLMService {
  if (!llmServiceInstance) {
    llmServiceInstance = new LLMService();
  }
  return llmServiceInstance;
}

export async function initializeLLMService(): Promise<LLMService> {
  const service = getLLMService();
  await service.initialize();
  return service;
}