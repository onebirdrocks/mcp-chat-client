import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMService, createLLMService, getDefaultProviderConfig, validateProviderConfig, getProviderModels } from '../LLMService';
import { ValidationError } from '@/lib/errors';

// Mock fetch globally
global.fetch = vi.fn();

describe('LLMService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and validation', () => {
    it('should create service with valid config', () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'sk-test123456789012345678901234567890',
        model: 'gpt-4',
      };

      expect(() => new LLMService(config)).not.toThrow();
    });

    it('should throw ValidationError for missing API key', () => {
      const config = {
        provider: 'openai' as const,
        apiKey: '',
        model: 'gpt-4',
      };

      expect(() => new LLMService(config)).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid provider', () => {
      const config = {
        provider: 'invalid' as any,
        apiKey: 'sk-test123456789012345678901234567890',
        model: 'gpt-4',
      };

      expect(() => new LLMService(config)).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid API key format', () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'invalid-key',
        model: 'gpt-4',
      };

      expect(() => new LLMService(config)).toThrow(ValidationError);
    });
  });

  describe('validateApiKey', () => {
    it('should validate OpenAI API key format', () => {
      const service = new LLMService({
        provider: 'openai',
        apiKey: 'sk-test123456789012345678901234567890',
        model: 'gpt-4',
      });

      expect(service.validateApiKey('sk-test123456789012345678901234567890')).toBe(true);
      expect(service.validateApiKey('invalid-key')).toBe(false);
      expect(service.validateApiKey('')).toBe(false);
    });

    it('should validate DeepSeek API key format', () => {
      const service = new LLMService({
        provider: 'deepseek',
        apiKey: 'sk-test123456789012345678901234567890',
        model: 'deepseek-chat',
      });

      expect(service.validateApiKey('sk-test123456789012345678901234567890')).toBe(true);
      expect(service.validateApiKey('invalid-key')).toBe(false);
    });

    it('should validate OpenRouter API key format', () => {
      const service = new LLMService({
        provider: 'openrouter',
        apiKey: 'sk-or-test123456789012345678901234567890',
        model: 'openai/gpt-4',
      });

      expect(service.validateApiKey('sk-or-test123456789012345678901234567890')).toBe(true);
      expect(service.validateApiKey('sk-test123456789012345678901234567890')).toBe(false);
    });
  });

  describe('getProviderCapabilities', () => {
    it('should return OpenAI capabilities', () => {
      const service = new LLMService({
        provider: 'openai',
        apiKey: 'sk-test123456789012345678901234567890',
        model: 'gpt-4',
      });

      const capabilities = service.getProviderCapabilities();
      expect(capabilities.supportsToolCalling).toBe(true);
      expect(capabilities.supportsStreaming).toBe(true);
      expect(capabilities.maxTokens).toBe(128000);
      expect(capabilities.supportedModels).toContain('gpt-4');
    });

    it('should return DeepSeek capabilities', () => {
      const service = new LLMService({
        provider: 'deepseek',
        apiKey: 'sk-test123456789012345678901234567890',
        model: 'deepseek-chat',
      });

      const capabilities = service.getProviderCapabilities();
      expect(capabilities.supportsToolCalling).toBe(true);
      expect(capabilities.maxTokens).toBe(32000);
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello!' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const service = new LLMService({
        provider: 'openai',
        apiKey: 'sk-test123456789012345678901234567890',
        model: 'gpt-4',
      });

      const result = await service.testConnection();
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error for failed connection', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const service = new LLMService({
        provider: 'openai',
        apiKey: 'sk-test123456789012345678901234567890',
        model: 'gpt-4',
        maxRetries: 0, // Disable retries for faster test
      });

      const result = await service.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('utility functions', () => {
    it('should create service with factory function', () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'sk-test123456789012345678901234567890',
        model: 'gpt-4',
      };

      const service = createLLMService(config);
      expect(service).toBeInstanceOf(LLMService);
    });

    it('should get default provider config', () => {
      const config = getDefaultProviderConfig('openai');
      expect(config.baseUrl).toBe('https://api.openai.com/v1');
      expect(config.model).toBe('gpt-4');
      expect(config.maxRetries).toBe(3);
    });

    it('should validate provider config', () => {
      const validConfig = {
        provider: 'openai' as const,
        apiKey: 'sk-test123456789012345678901234567890',
        model: 'gpt-4',
      };

      const errors = validateProviderConfig(validConfig);
      expect(errors).toHaveLength(0);

      const invalidConfig = {
        provider: 'invalid' as any,
        apiKey: '',
        model: '',
      };

      const invalidErrors = validateProviderConfig(invalidConfig);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('should get provider models', () => {
      const openaiModels = getProviderModels('openai');
      expect(openaiModels.length).toBeGreaterThan(0);
      expect(openaiModels[0]).toHaveProperty('id');
      expect(openaiModels[0]).toHaveProperty('name');
      expect(openaiModels[0]).toHaveProperty('supportsToolCalling');
    });
  });
});