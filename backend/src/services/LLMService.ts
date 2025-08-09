import { LLMProvider, Message, ToolCall } from '@/types';
import { InternalServerError, ValidationError } from '@/lib/errors';

export interface LLMCompletionRequest {
  messages: Array<{ role: string; content: string; tool_calls?: ToolCall[]; tool_call_id?: string }>;
  maxTokens?: number;
  temperature?: number;
  model?: string;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: object;
    };
  }>;
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

export interface LLMCompletionResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface LLMServiceConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string;
  model: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface LLMProviderCapabilities {
  supportsToolCalling: boolean;
  supportsStreaming: boolean;
  maxTokens: number;
  supportedModels: string[];
}

export interface LLMError extends Error {
  code?: string;
  statusCode?: number;
  retryable?: boolean;
}

export class LLMService {
  private config: LLMServiceConfig;
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_RETRY_DELAY = 1000; // 1 second
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  constructor(config: LLMServiceConfig) {
    this.config = {
      maxRetries: LLMService.DEFAULT_MAX_RETRIES,
      retryDelay: LLMService.DEFAULT_RETRY_DELAY,
      timeout: LLMService.DEFAULT_TIMEOUT,
      ...config,
    };
    this.validateConfig();
  }

  /**
   * Generate a completion using the configured LLM provider with retry logic
   */
  async generateCompletion(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    return this.executeWithRetry(async () => {
      switch (this.config.provider) {
        case 'openai':
          return await this.callOpenAI(request);
        case 'deepseek':
          return await this.callDeepSeek(request);
        case 'openrouter':
          return await this.callOpenRouter(request);
        default:
          throw new ValidationError(`Unsupported LLM provider: ${this.config.provider}`);
      }
    });
  }

  /**
   * Test the connection to the LLM provider
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.generateCompletion({
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 5,
        temperature: 0,
      });
      return { success: !!response.content };
    } catch (error) {
      console.error('Connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get provider capabilities
   */
  getProviderCapabilities(): LLMProviderCapabilities {
    switch (this.config.provider) {
      case 'openai':
        return {
          supportsToolCalling: true,
          supportsStreaming: true,
          maxTokens: 128000, // GPT-4 context window
          supportedModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        };
      case 'deepseek':
        return {
          supportsToolCalling: true,
          supportsStreaming: true,
          maxTokens: 32000,
          supportedModels: ['deepseek-chat', 'deepseek-coder'],
        };
      case 'openrouter':
        return {
          supportsToolCalling: true,
          supportsStreaming: true,
          maxTokens: 200000, // Varies by model
          supportedModels: ['anthropic/claude-3-opus', 'openai/gpt-4', 'meta-llama/llama-2-70b-chat'],
        };
      default:
        throw new ValidationError(`Unsupported LLM provider: ${this.config.provider}`);
    }
  }

  /**
   * Validate API key format for the provider
   */
  validateApiKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    switch (this.config.provider) {
      case 'openai':
        return apiKey.startsWith('sk-') && apiKey.length > 20;
      case 'deepseek':
        return apiKey.startsWith('sk-') && apiKey.length > 20;
      case 'openrouter':
        return apiKey.startsWith('sk-or-') && apiKey.length > 30;
      default:
        return apiKey.length > 10; // Basic length check for unknown providers
    }
  }

  /**
   * Execute a function with retry logic for transient errors
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error = new Error('Unknown error');
    const maxRetries = this.config.maxRetries || LLMService.DEFAULT_MAX_RETRIES;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.withTimeout(fn(), this.config.timeout || LLMService.DEFAULT_TIMEOUT);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on validation errors or non-retryable errors
        if (error instanceof ValidationError || !this.isRetryableError(error as Error)) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = (this.config.retryDelay || LLMService.DEFAULT_RETRY_DELAY) * Math.pow(2, attempt);
        await this.sleep(delay);
        
        console.warn(`LLM request attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
      }
    }

    throw new InternalServerError(`LLM request failed after ${maxRetries + 1} attempts: ${lastError.message}`);
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const llmError = error as LLMError;
    
    // Explicitly marked as retryable
    if (llmError.retryable !== undefined) {
      return llmError.retryable;
    }

    // Network errors are generally retryable
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return true;
    }

    // HTTP status codes that are retryable
    if (llmError.statusCode) {
      return [408, 429, 500, 502, 503, 504].includes(llmError.statusCode);
    }

    // Rate limit errors
    if (error.message.toLowerCase().includes('rate limit')) {
      return true;
    }

    return false;
  }

  /**
   * Add timeout to a promise
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new ValidationError('API key is required');
    }
    if (!this.config.model) {
      throw new ValidationError('Model is required');
    }
    if (!['openai', 'deepseek', 'openrouter'].includes(this.config.provider)) {
      throw new ValidationError('Invalid LLM provider');
    }
    if (!this.validateApiKey(this.config.apiKey)) {
      throw new ValidationError(`Invalid API key format for ${this.config.provider}`);
    }
    if (this.config.maxRetries !== undefined && this.config.maxRetries < 0) {
      throw new ValidationError('Max retries must be non-negative');
    }
    if (this.config.retryDelay !== undefined && this.config.retryDelay < 0) {
      throw new ValidationError('Retry delay must be non-negative');
    }
    if (this.config.timeout !== undefined && this.config.timeout <= 0) {
      throw new ValidationError('Timeout must be positive');
    }
  }

  private async callOpenAI(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    const url = `${baseUrl}/chat/completions`;

    const requestBody: any = {
      model: request.model || this.config.model,
      messages: request.messages,
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature ?? 0.7,
    };

    // Add tool support if tools are provided
    if (request.tools && request.tools.length > 0) {
      requestBody.tools = request.tools;
      if (request.toolChoice) {
        requestBody.tool_choice = request.toolChoice;
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'User-Agent': 'MCP-Chat-UI/1.0',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }

      const error = new Error(`OpenAI API error: ${errorData.error?.message || errorText}`) as LLMError;
      error.statusCode = response.status;
      error.code = errorData.error?.code;
      error.retryable = [408, 429, 500, 502, 503, 504].includes(response.status);
      throw error;
    }

    const data = await response.json();
    const choice = data.choices[0];
    
    if (!choice) {
      throw new Error('No response choices returned from OpenAI API');
    }

    return {
      content: choice.message?.content || '',
      toolCalls: choice.message?.tool_calls?.map((tc: any) => ({
        id: tc.id,
        type: tc.type,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      finishReason: choice.finish_reason,
    };
  }

  private async callDeepSeek(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const baseUrl = this.config.baseUrl || 'https://api.deepseek.com/v1';
    const url = `${baseUrl}/chat/completions`;

    const requestBody: any = {
      model: request.model || this.config.model,
      messages: request.messages,
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature ?? 0.7,
    };

    // Add tool support if tools are provided
    if (request.tools && request.tools.length > 0) {
      requestBody.tools = request.tools;
      if (request.toolChoice) {
        requestBody.tool_choice = request.toolChoice;
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'User-Agent': 'MCP-Chat-UI/1.0',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }

      const error = new Error(`DeepSeek API error: ${errorData.error?.message || errorText}`) as LLMError;
      error.statusCode = response.status;
      error.code = errorData.error?.code;
      error.retryable = [408, 429, 500, 502, 503, 504].includes(response.status);
      throw error;
    }

    const data = await response.json();
    const choice = data.choices[0];
    
    if (!choice) {
      throw new Error('No response choices returned from DeepSeek API');
    }

    return {
      content: choice.message?.content || '',
      toolCalls: choice.message?.tool_calls?.map((tc: any) => ({
        id: tc.id,
        type: tc.type,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      finishReason: choice.finish_reason,
    };
  }

  private async callOpenRouter(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const baseUrl = this.config.baseUrl || 'https://openrouter.ai/api/v1';
    const url = `${baseUrl}/chat/completions`;

    const requestBody: any = {
      model: request.model || this.config.model,
      messages: request.messages,
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature ?? 0.7,
    };

    // Add tool support if tools are provided
    if (request.tools && request.tools.length > 0) {
      requestBody.tools = request.tools;
      if (request.toolChoice) {
        requestBody.tool_choice = request.toolChoice;
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter
        'X-Title': 'MCP Chat UI', // Optional but recommended
        'User-Agent': 'MCP-Chat-UI/1.0',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }

      const error = new Error(`OpenRouter API error: ${errorData.error?.message || errorText}`) as LLMError;
      error.statusCode = response.status;
      error.code = errorData.error?.code;
      error.retryable = [408, 429, 500, 502, 503, 504].includes(response.status);
      throw error;
    }

    const data = await response.json();
    const choice = data.choices[0];
    
    if (!choice) {
      throw new Error('No response choices returned from OpenRouter API');
    }

    return {
      content: choice.message?.content || '',
      toolCalls: choice.message?.tool_calls?.map((tc: any) => ({
        id: tc.id,
        type: tc.type,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      finishReason: choice.finish_reason,
    };
  }
}

/**
 * Factory function to create LLM service instances
 */
export function createLLMService(config: LLMServiceConfig): LLMService {
  return new LLMService(config);
}

/**
 * Get default configuration for a provider
 */
export function getDefaultProviderConfig(provider: LLMProvider): Partial<LLMServiceConfig> {
  switch (provider) {
    case 'openai':
      return {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4',
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000,
      };
    case 'deepseek':
      return {
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000,
      };
    case 'openrouter':
      return {
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'openai/gpt-4',
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 45000, // OpenRouter may be slower
      };
    default:
      throw new ValidationError(`Unsupported provider: ${provider}`);
  }
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(config: Partial<LLMServiceConfig>): string[] {
  const errors: string[] = [];

  if (!config.provider) {
    errors.push('Provider is required');
  } else if (!['openai', 'deepseek', 'openrouter'].includes(config.provider)) {
    errors.push('Invalid provider');
  }

  if (!config.apiKey) {
    errors.push('API key is required');
  } else if (config.provider) {
    const service = new LLMService({ ...config, model: 'test' } as LLMServiceConfig);
    if (!service.validateApiKey(config.apiKey)) {
      errors.push(`Invalid API key format for ${config.provider}`);
    }
  }

  if (!config.model) {
    errors.push('Model is required');
  }

  if (config.maxRetries !== undefined && config.maxRetries < 0) {
    errors.push('Max retries must be non-negative');
  }

  if (config.retryDelay !== undefined && config.retryDelay < 0) {
    errors.push('Retry delay must be non-negative');
  }

  if (config.timeout !== undefined && config.timeout <= 0) {
    errors.push('Timeout must be positive');
  }

  return errors;
}

/**
 * Get available models for a provider
 */
export function getProviderModels(provider: LLMProvider): Array<{ id: string; name: string; supportsToolCalling: boolean }> {
  switch (provider) {
    case 'openai':
      return [
        { id: 'gpt-4', name: 'GPT-4', supportsToolCalling: true },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', supportsToolCalling: true },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', supportsToolCalling: true },
      ];
    case 'deepseek':
      return [
        { id: 'deepseek-chat', name: 'DeepSeek Chat', supportsToolCalling: true },
        { id: 'deepseek-coder', name: 'DeepSeek Coder', supportsToolCalling: true },
      ];
    case 'openrouter':
      return [
        { id: 'openai/gpt-4', name: 'GPT-4 (via OpenRouter)', supportsToolCalling: true },
        { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', supportsToolCalling: true },
        { id: 'meta-llama/llama-2-70b-chat', name: 'Llama 2 70B', supportsToolCalling: false },
      ];
    default:
      return [];
  }
}
/**
 *
 Test LLM provider connection
 */
export async function testLLMProviderConnection(provider: {
  name: string;
  apiKey: string;
  baseUrl?: string;
  models: Array<{ id: string; name: string; supportsToolCalling: boolean; maxTokens: number }>;
}): Promise<{ success: boolean; error?: string }> {
  if (!provider.apiKey) {
    return { success: false, error: 'API key is required' };
  }

  const baseUrl = provider.baseUrl || getDefaultProviderConfig(provider.name as LLMProvider).baseUrl;
  
  try {
    // Create a minimal test request
    const testPayload = {
      model: provider.models[0]?.id || getDefaultModelForProvider(provider.name as LLMProvider),
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5,
      temperature: 0,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Set authorization header based on provider
    if (provider.name === 'openai' || provider.name === 'deepseek') {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    } else if (provider.name === 'openrouter') {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
      headers['HTTP-Referer'] = 'https://mcp-chat-ui.local';
      headers['X-Title'] = 'MCP Chat UI';
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
    return { success: false, error: errorMessage };
  }
}

/**
 * Helper function to get default model for provider
 */
function getDefaultModelForProvider(provider: LLMProvider): string {
  const defaultModels: Record<LLMProvider, string> = {
    openai: 'gpt-3.5-turbo',
    deepseek: 'deepseek-chat',
    openrouter: 'openai/gpt-3.5-turbo',
  };
  return defaultModels[provider] || 'gpt-3.5-turbo';
}