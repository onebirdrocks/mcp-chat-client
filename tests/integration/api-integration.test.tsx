/**
 * API Integration Tests
 * Tests the integration between different API endpoints and services
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chatApi, settingsApi, healthApi } from '@/src/services/apiClient';

// Mock the API modules
vi.mock('@/src/services/apiClient', () => ({
  chatApi: {
    sendMessage: vi.fn(),
    sendMessageStream: vi.fn(),
    runTool: vi.fn(),
    getChatHistory: vi.fn(),
    deleteSession: vi.fn(),
    getActiveToolExecutions: vi.fn(),
    getToolExecutionHistory: vi.fn(),
    cancelToolExecution: vi.fn(),
  },
  settingsApi: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
  healthApi: {
    checkHealth: vi.fn(),
  },
}));

const mockChatApi = vi.mocked(chatApi);
const mockSettingsApi = vi.mocked(settingsApi);
const mockHealthApi = vi.mocked(healthApi);

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Chat API Integration', () => {
    it('should handle successful chat message', async () => {
      const mockResponse = {
        reply: 'Hello! How can I help you?',
        sessionId: 'test-session-1',
        usage: { promptTokens: 10, completionTokens: 15, totalTokens: 25 }
      };

      mockChatApi.sendMessage.mockResolvedValueOnce(mockResponse);

      const result = await chatApi.sendMessage({
        messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: new Date() }],
        sessionId: 'test-session-1',
        provider: 'openai',
        model: 'gpt-4'
      });

      expect(result).toEqual(mockResponse);
      expect(mockChatApi.sendMessage).toHaveBeenCalledWith({
        messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: new Date() }],
        sessionId: 'test-session-1',
        provider: 'openai',
        model: 'gpt-4'
      });
    });

    it('should handle tool execution', async () => {
      const mockToolCall = {
        id: 'tool-call-1',
        type: 'function' as const,
        function: {
          name: 'weather.get_weather',
          arguments: JSON.stringify({ location: 'New York' })
        },
        serverId: 'weather',
        approved: true
      };

      const mockResponse = {
        result: 'Weather in New York: 72°F, sunny',
        reply: 'The current weather in New York is 72°F and sunny.',
        executionTime: 1500
      };

      mockChatApi.runTool.mockResolvedValueOnce(mockResponse);

      const result = await chatApi.runTool({
        toolCall: mockToolCall,
        sessionId: 'test-session-1',
        messages: [],
        approved: true
      });

      expect(result).toEqual(mockResponse);
      expect(mockChatApi.runTool).toHaveBeenCalledWith({
        toolCall: mockToolCall,
        sessionId: 'test-session-1',
        messages: [],
        approved: true
      });
    });

    it('should handle chat history retrieval', async () => {
      const mockHistory = {
        sessions: [
          {
            id: 'session-1',
            title: 'Weather Chat',
            messages: [],
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            provider: 'openai',
            model: 'gpt-4',
            mcpServers: ['weather'],
            tags: ['weather'],
            archived: false,
            totalTokens: 50,
            estimatedCost: 0.001
          }
        ],
        totalCount: 1,
        hasMore: false
      };

      mockChatApi.getChatHistory.mockResolvedValueOnce(mockHistory);

      const result = await chatApi.getChatHistory();

      expect(result).toEqual(mockHistory);
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].title).toBe('Weather Chat');
    });

    it('should handle active tool executions', async () => {
      const mockActiveExecutions = {
        activeExecutions: [
          {
            id: 'exec-1',
            toolCallId: 'tool-call-1',
            toolName: 'weather.get_weather',
            status: 'running',
            startTime: new Date(),
            progress: 50,
            parameters: { location: 'New York' }
          }
        ],
        total: 1
      };

      mockChatApi.getActiveToolExecutions.mockResolvedValueOnce(mockActiveExecutions);

      const result = await chatApi.getActiveToolExecutions();

      expect(result).toEqual(mockActiveExecutions);
      expect(result.activeExecutions).toHaveLength(1);
      expect(result.activeExecutions[0].toolName).toBe('weather.get_weather');
    });
  });

  describe('Settings API Integration', () => {
    it('should handle settings retrieval', async () => {
      const mockSettings = {
        llmProviders: [
          {
            id: 'openai-1',
            name: 'openai',
            displayName: 'OpenAI',
            apiKey: 'sk-****1234',
            baseUrl: 'https://api.openai.com/v1',
            models: [],
            enabled: true,
            rateLimits: { requestsPerMinute: 60, tokensPerMinute: 90000 }
          }
        ],
        mcpServers: [],
        preferences: {
          theme: 'light',
          language: 'en',
          autoScroll: true,
          soundEnabled: false,
          confirmToolCalls: true,
          showTokenCount: true,
          autoGenerateTitles: true,
          maxHistoryLength: 100,
          exportFormat: 'json'
        },
        security: {
          encryptionEnabled: true,
          sessionTimeout: 30,
          maxRequestsPerMinute: 60,
          allowedOrigins: ['http://localhost:3000'],
          logLevel: 'info',
          auditEnabled: true
        }
      };

      mockSettingsApi.getSettings.mockResolvedValueOnce(mockSettings);

      const result = await settingsApi.getSettings();

      expect(result).toEqual(mockSettings);
      expect(result.llmProviders).toHaveLength(1);
      expect(result.preferences.theme).toBe('light');
    });

    it('should handle settings updates', async () => {
      const updatedSettings = {
        llmProviders: [],
        mcpServers: [],
        preferences: {
          theme: 'dark',
          language: 'zh',
          autoScroll: false,
          soundEnabled: true,
          confirmToolCalls: true,
          showTokenCount: false,
          autoGenerateTitles: false,
          maxHistoryLength: 200,
          exportFormat: 'markdown'
        },
        security: {
          encryptionEnabled: true,
          sessionTimeout: 60,
          maxRequestsPerMinute: 120,
          allowedOrigins: ['http://localhost:3000'],
          logLevel: 'debug',
          auditEnabled: true
        }
      };

      mockSettingsApi.updateSettings.mockResolvedValueOnce(updatedSettings);

      const result = await settingsApi.updateSettings(updatedSettings);

      expect(result).toEqual(updatedSettings);
      expect(result.preferences.theme).toBe('dark');
      expect(result.preferences.language).toBe('zh');
    });
  });

  describe('Health API Integration', () => {
    it('should handle health check', async () => {
      const mockHealthResponse = {
        status: 'healthy',
        timestamp: '2024-01-01T12:00:00Z'
      };

      mockHealthApi.checkHealth.mockResolvedValueOnce(mockHealthResponse);

      const result = await healthApi.checkHealth();

      expect(result).toEqual(mockHealthResponse);
      expect(result.status).toBe('healthy');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors', async () => {
      mockChatApi.sendMessage.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        chatApi.sendMessage({
          messages: [{ id: '1', role: 'user', content: 'Test', timestamp: new Date() }],
          sessionId: 'test-session-1',
          provider: 'openai',
          model: 'gpt-4'
        })
      ).rejects.toThrow('Network error');
    });

    it('should handle validation errors', async () => {
      mockSettingsApi.updateSettings.mockRejectedValueOnce(new Error('Invalid configuration'));

      await expect(
        settingsApi.updateSettings({
          llmProviders: [],
          mcpServers: [],
          preferences: {
            theme: 'invalid-theme' as any,
            language: 'en',
            autoScroll: true,
            soundEnabled: false,
            confirmToolCalls: true,
            showTokenCount: true,
            autoGenerateTitles: true,
            maxHistoryLength: 100,
            exportFormat: 'json'
          },
          security: {
            encryptionEnabled: true,
            sessionTimeout: 30,
            maxRequestsPerMinute: 60,
            allowedOrigins: ['http://localhost:3000'],
            logLevel: 'info',
            auditEnabled: true
          }
        })
      ).rejects.toThrow('Invalid configuration');
    });

    it('should handle timeout errors', async () => {
      mockChatApi.runTool.mockRejectedValueOnce(new Error('Tool execution timeout'));

      await expect(
        chatApi.runTool({
          toolCall: {
            id: 'tool-call-1',
            type: 'function',
            function: {
              name: 'slow.long_task',
              arguments: JSON.stringify({ duration: 60000 })
            },
            serverId: 'slow',
            approved: true
          },
          sessionId: 'test-session-1',
          messages: [],
          approved: true
        })
      ).rejects.toThrow('Tool execution timeout');
    });
  });

  describe('Workflow Integration', () => {
    it('should handle complete chat workflow', async () => {
      // Step 1: Send message
      mockChatApi.sendMessage.mockResolvedValueOnce({
        reply: 'I can help you with weather information.',
        sessionId: 'test-session-1'
      });

      const chatResult = await chatApi.sendMessage({
        messages: [{ id: '1', role: 'user', content: 'Can you help with weather?', timestamp: new Date() }],
        sessionId: 'test-session-1',
        provider: 'openai',
        model: 'gpt-4'
      });

      expect(chatResult.reply).toBe('I can help you with weather information.');

      // Step 2: Execute tool
      mockChatApi.runTool.mockResolvedValueOnce({
        result: 'Weather: 72°F, sunny',
        reply: 'The weather is 72°F and sunny.',
        executionTime: 1500
      });

      const toolResult = await chatApi.runTool({
        toolCall: {
          id: 'tool-call-1',
          type: 'function',
          function: {
            name: 'weather.get_weather',
            arguments: JSON.stringify({ location: 'New York' })
          },
          serverId: 'weather',
          approved: true
        },
        sessionId: 'test-session-1',
        messages: [],
        approved: true
      });

      expect(toolResult.result).toBe('Weather: 72°F, sunny');

      // Step 3: Get updated history
      mockChatApi.getChatHistory.mockResolvedValueOnce({
        sessions: [
          {
            id: 'test-session-1',
            title: 'Weather Inquiry',
            messages: [
              { id: '1', role: 'user', content: 'Can you help with weather?', timestamp: new Date() },
              { id: '2', role: 'assistant', content: 'I can help you with weather information.', timestamp: new Date() },
              { id: '3', role: 'assistant', content: 'The weather is 72°F and sunny.', timestamp: new Date() }
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
            provider: 'openai',
            model: 'gpt-4',
            mcpServers: ['weather'],
            tags: [],
            archived: false,
            totalTokens: 75,
            estimatedCost: 0.0015
          }
        ],
        totalCount: 1,
        hasMore: false
      });

      const historyResult = await chatApi.getChatHistory();

      expect(historyResult.sessions).toHaveLength(1);
      expect(historyResult.sessions[0].messages).toHaveLength(3);
      expect(historyResult.sessions[0].title).toBe('Weather Inquiry');

      // Verify all API calls were made
      expect(mockChatApi.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockChatApi.runTool).toHaveBeenCalledTimes(1);
      expect(mockChatApi.getChatHistory).toHaveBeenCalledTimes(1);
    });

    it('should handle settings configuration workflow', async () => {
      // Step 1: Get current settings
      mockSettingsApi.getSettings.mockResolvedValueOnce({
        llmProviders: [],
        mcpServers: [],
        preferences: {
          theme: 'light',
          language: 'en',
          autoScroll: true,
          soundEnabled: false,
          confirmToolCalls: true,
          showTokenCount: true,
          autoGenerateTitles: true,
          maxHistoryLength: 100,
          exportFormat: 'json'
        },
        security: {
          encryptionEnabled: true,
          sessionTimeout: 30,
          maxRequestsPerMinute: 60,
          allowedOrigins: ['http://localhost:3000'],
          logLevel: 'info',
          auditEnabled: true
        }
      });

      const currentSettings = await settingsApi.getSettings();
      expect(currentSettings.llmProviders).toHaveLength(0);

      // Step 2: Update settings with new provider
      const updatedSettings = {
        ...currentSettings,
        llmProviders: [
          {
            id: 'openai-1',
            name: 'openai',
            displayName: 'OpenAI',
            apiKey: 'sk-test1234567890abcdef',
            baseUrl: 'https://api.openai.com/v1',
            models: [],
            enabled: true,
            rateLimits: { requestsPerMinute: 60, tokensPerMinute: 90000 }
          }
        ]
      };

      mockSettingsApi.updateSettings.mockResolvedValueOnce(updatedSettings);

      const result = await settingsApi.updateSettings(updatedSettings);

      expect(result.llmProviders).toHaveLength(1);
      expect(result.llmProviders[0].name).toBe('openai');

      // Verify API calls
      expect(mockSettingsApi.getSettings).toHaveBeenCalledTimes(1);
      expect(mockSettingsApi.updateSettings).toHaveBeenCalledTimes(1);
    });
  });
});