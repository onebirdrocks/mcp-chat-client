import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import OpenAI from 'openai';
import { LLMService, getLLMService } from '../LLMService';
import { getSecureSettingsManager } from '../../../backend/src/services/SecureSettingsManager';
import { ValidationError, InternalServerError } from '../../../backend/src/lib/errors';
import { Message, TokenUsage } from '../../types';

// Mock OpenAI
vi.mock('openai');
const MockedOpenAI = vi.mocked(OpenAI);

// Mock SecureSettingsManager
vi.mock('../../../backend/src/services/SecureSettingsManager');
const mockedGetSecureSettingsManager = vi.mocked(getSecureSettingsManager);

describe('LLMService', () => {
  let llmService: LLMService;
  let mockSettingsManager: any;
  let mockOpenAIClient: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock settings manager
    mockSettingsManager = {
      initialize: vi.fn(),
      getSettings: vi.fn(),
      getDecryptedApiKey: vi.fn(),
    };
    mockedGetSecureSettingsManager.mockReturnValue(mockSettingsManager);

    // Mock OpenAI client
    mockOpenAIClient = {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
      models: {
        list: vi.fn(),
      },
    };
    MockedOpenAI.mockImplementation(() => mockOpenAIClient);

    // Create fresh service instance
    llmService = new LLMService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      mockSettingsManager.initialize.mockResolvedValue(undefined);

      await llmService.initialize();

      expect(mockSettingsManager.initialize).toHaveBeenCalledOnce();
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Settings initialization failed');
      mockSettingsManager.initialize.mockRejectedValue(error);

      await expect(llmService.initialize()).rejects.toThrow(error);
    });
  });

  describe('chat completion', () => {
    const mockProvider = {
      id: 'openai-1',
      name: 'openai',
      apiKey: 'encrypted-key',
      baseUrl: 'https://api.openai.com/v1',
      models: [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          displayName: 'GPT-4',
          supportsToolCalling: true,
          maxTokens: 8192,
        },
      ],
    };

    const mockMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello, world!',
        timestamp: new Date(),
      },
    ];

    beforeEach(() => {
      mockSettingsManager.getSettings.mockResolvedValue({
        llmProviders: [mockProvider],
        mcpServers: [],
        preferences: {},
      });
      mockSettingsManager.getDecryptedApiKey.mockResolvedValue('sk-test-key');
    });

    it('should send chat completion successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Hello! How can I help you?',
              role: 'assistant',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18,
        },
        model: 'gpt-4',
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await llmService.chat('openai-1', {
        messages: mockMessages,
        model: 'gpt-4',
        temperature: 0.7,
      });

      expect(result).toEqual({
        content: 'Hello! How can I help you?',
        usage: {
          promptTokens: 10,
          completionTokens: 8,
          totalTokens: 18,
        },
        finishReason: 'stop',
        model: 'gpt-4',
      });

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello, world!' }],
        temperature: 0.7,
        max_tokens: undefined,
        tools: undefined,
        stream: false,
      });
    });

    it('should handle tool calls in response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
              role: 'assistant',
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'filesystem.read_file',
                    arguments: '{"path": "/test.txt"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 5,
          total_tokens: 20,
        },
        model: 'gpt-4',
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await llmService.chat('openai-1', {
        messages: mockMessages,
        model: 'gpt-4',
      });

      expect(result.toolCalls).toEqual([
        {
          id: 'call_123',
          type: 'function',
          function: {
            name: 'filesystem.read_file',
            arguments: '{"path": "/test.txt"}',
          },
          serverId: 'filesystem',
        },
      ]);
    });

    it('should handle provider not found error', async () => {
      mockSettingsManager.getSettings.mockResolvedValue({
        llmProviders: [],
        mcpServers: [],
        preferences: {},
      });

      await expect(
        llmService.chat('nonexistent', {
          messages: mockMessages,
          model: 'gpt-4',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should handle API key not configured error', async () => {
      mockSettingsManager.getDecryptedApiKey.mockRejectedValue(
        new ValidationError('API key not found')
      );

      await expect(
        llmService.chat('openai-1', {
          messages: mockMessages,
          model: 'gpt-4',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should handle OpenAI API errors', async () => {
      const apiError = {
        status: 401,
        message: 'Invalid API key',
      };
      // Mock as OpenAI.APIError instance
      Object.setPrototypeOf(apiError, OpenAI.APIError.prototype);
      mockOpenAIClient.chat.completions.create.mockRejectedValue(apiError);

      await expect(
        llmService.chat('openai-1', {
          messages: mockMessages,
          model: 'gpt-4',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = {
        status: 429,
        message: 'Rate limit exceeded',
      };
      // Mock as OpenAI.APIError instance
      Object.setPrototypeOf(rateLimitError, OpenAI.APIError.prototype);
      mockOpenAIClient.chat.completions.create.mockRejectedValue(rateLimitError);

      await expect(
        llmService.chat('openai-1', {
          messages: mockMessages,
          model: 'gpt-4',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('streaming chat completion', () => {
    const mockProvider = {
      id: 'openai-1',
      name: 'openai',
      apiKey: 'encrypted-key',
      baseUrl: 'https://api.openai.com/v1',
      models: [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          displayName: 'GPT-4',
          supportsToolCalling: true,
          maxTokens: 8192,
        },
      ],
    };

    const mockMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello, world!',
        timestamp: new Date(),
      },
    ];

    beforeEach(() => {
      mockSettingsManager.getSettings.mockResolvedValue({
        llmProviders: [mockProvider],
        mcpServers: [],
        preferences: {},
      });
      mockSettingsManager.getDecryptedApiKey.mockResolvedValue('sk-test-key');
    });

    it('should handle streaming responses', async () => {
      const mockStreamChunks = [
        {
          choices: [
            {
              delta: { content: 'Hello' },
              finish_reason: null,
            },
          ],
        },
        {
          choices: [
            {
              delta: { content: ' there!' },
              finish_reason: null,
            },
          ],
        },
        {
          choices: [
            {
              delta: {},
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        },
      ];

      // Mock async iterator
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockStreamChunks) {
            yield chunk;
          }
        },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockStream);

      const chunks = [];
      for await (const chunk of llmService.chatStream('openai-1', {
        messages: mockMessages,
        model: 'gpt-4',
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual({
        content: 'Hello',
        done: false,
      });
      expect(chunks[1]).toEqual({
        content: ' there!',
        done: false,
      });
      expect(chunks[2]).toEqual({
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
        finishReason: 'stop',
        done: true,
      });
    });

    it('should handle streaming tool calls', async () => {
      const mockStreamChunks = [
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_123',
                    function: { name: 'filesystem.read_file' },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        },
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    function: { arguments: '{"path":' },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        },
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    function: { arguments: '"/test.txt"}' },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
        },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockStreamChunks) {
            yield chunk;
          }
        },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockStream);

      const chunks = [];
      for await (const chunk of llmService.chatStream('openai-1', {
        messages: mockMessages,
        model: 'gpt-4',
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[2].toolCalls).toEqual([
        {
          id: 'call_123',
          type: 'function',
          function: {
            name: 'filesystem.read_file',
            arguments: '{"path":"/test.txt"}',
          },
          serverId: 'filesystem',
        },
      ]);
    });
  });

  describe('connection testing', () => {
    const mockProvider = {
      id: 'openai-1',
      name: 'openai',
      apiKey: 'encrypted-key',
      baseUrl: 'https://api.openai.com/v1',
      models: [],
    };

    beforeEach(() => {
      mockSettingsManager.getSettings.mockResolvedValue({
        llmProviders: [mockProvider],
        mcpServers: [],
        preferences: {},
      });
      mockSettingsManager.getDecryptedApiKey.mockResolvedValue('sk-test-key');
    });

    it('should test connection successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Hi', role: 'assistant' },
            finish_reason: 'stop',
          },
        ],
      };

      const mockModelsResponse = {
        data: [
          { id: 'gpt-4', object: 'model' },
          { id: 'gpt-3.5-turbo', object: 'model' },
        ],
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      mockOpenAIClient.models.list.mockResolvedValue(mockModelsResponse);

      const result = await llmService.testConnection('openai-1');

      expect(result.success).toBe(true);
      expect(result.models).toHaveLength(2);
      expect(result.models![0].id).toBe('gpt-4');
    });

    it('should handle connection test failure', async () => {
      const error = {
        status: 401,
        message: 'Invalid API key',
      };
      // Mock as OpenAI.APIError instance
      Object.setPrototypeOf(error, OpenAI.APIError.prototype);
      mockOpenAIClient.chat.completions.create.mockRejectedValue(error);

      const result = await llmService.testConnection('openai-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });
  });

  describe('cost estimation', () => {
    it('should estimate cost correctly for GPT-4', () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const estimate = llmService.estimateCost('openai-1', 'gpt-4', usage);

      expect(estimate.inputTokens).toBe(1000);
      expect(estimate.outputTokens).toBe(500);
      expect(estimate.inputCost).toBe(0.03); // 1000/1000 * 0.03
      expect(estimate.outputCost).toBe(0.03); // 500/1000 * 0.06
      expect(estimate.totalCost).toBe(0.06);
      expect(estimate.currency).toBe('USD');
    });

    it('should estimate cost for unknown model with default pricing', () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 1000,
        totalTokens: 2000,
      };

      const estimate = llmService.estimateCost('openai-1', 'unknown-model', usage);

      expect(estimate.inputCost).toBe(0.001); // Default pricing
      expect(estimate.outputCost).toBe(0.002); // Default pricing
      expect(estimate.totalCost).toBe(0.003);
    });
  });

  describe('provider capabilities', () => {
    const mockProvider = {
      id: 'openai-1',
      name: 'openai',
      apiKey: 'encrypted-key',
      baseUrl: 'https://api.openai.com/v1',
      models: [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          displayName: 'GPT-4',
          supportsToolCalling: true,
          maxTokens: 8192,
        },
      ],
    };

    beforeEach(() => {
      mockSettingsManager.getSettings.mockResolvedValue({
        llmProviders: [mockProvider],
        mcpServers: [],
        preferences: {},
      });
    });

    it('should return provider capabilities', async () => {
      const capabilities = await llmService.getProviderCapabilities('openai-1');

      expect(capabilities).toEqual({
        supportsStreaming: true,
        supportsToolCalling: true,
        maxTokens: 128000, // OpenAI max tokens
        supportedModels: ['gpt-4'],
      });
    });

    it('should handle provider not found', async () => {
      await expect(
        llmService.getProviderCapabilities('nonexistent')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const service1 = getLLMService();
      const service2 = getLLMService();

      expect(service1).toBe(service2);
    });
  });
});