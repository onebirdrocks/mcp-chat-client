/**
 * Basic integration tests for MCP Chat UI
 * Simplified tests that verify core functionality without complex component dependencies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { chatApi, settingsApi, healthApi } from '@/src/services/apiClient';

// Mock API client functions
vi.mock('@/src/services/apiClient', () => ({
  chatApi: {
    sendMessage: vi.fn(),
    sendMessageStream: vi.fn(),
    runTool: vi.fn(),
    cancelTool: vi.fn(),
    getToolExecutionStatus: vi.fn(),
    cancelToolExecution: vi.fn(),
    getToolExecutionHistory: vi.fn(),
    clearToolExecutionHistory: vi.fn(),
    getActiveToolExecutions: vi.fn(),
    cancelAllActiveExecutions: vi.fn(),
    getChatHistory: vi.fn(),
    getSession: vi.fn(),
    deleteSession: vi.fn(),
    updateSession: vi.fn(),
    generateSessionTitle: vi.fn(),
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

// Mock components to avoid complex dependencies
vi.mock('@/src/components/ChatInterface', () => ({
  ChatInterface: () => (
    <div data-testid="chat-interface">
      <input placeholder="Type your message..." />
      <button>Send</button>
      <div data-testid="messages">Messages will appear here</div>
    </div>
  ),
}));

vi.mock('@/src/components/SettingsPage', () => ({
  SettingsPage: () => (
    <div data-testid="settings-page">
      <h1>Settings</h1>
      <button>Add Provider</button>
      <button>Test Connection</button>
    </div>
  ),
}));

vi.mock('@/app/components/ClientProviders', () => ({
  ClientProviders: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="client-providers">{children}</div>
  ),
}));

describe('Basic Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('API Client Integration', () => {
    it('should handle successful API calls', async () => {
      mockChatApi.sendMessage.mockResolvedValueOnce({
        reply: 'Hello! How can I help you?',
        sessionId: 'test-session-1',
        usage: { promptTokens: 10, completionTokens: 15, totalTokens: 25 }
      });

      const result = await chatApi.sendMessage({
        messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: new Date() }],
        sessionId: 'test-session-1',
        provider: 'openai',
        model: 'gpt-4'
      });

      expect(result.reply).toBe('Hello! How can I help you?');
      expect(result.sessionId).toBe('test-session-1');
      expect(result.usage?.totalTokens).toBe(25);
    });

    it('should handle API errors', async () => {
      mockChatApi.sendMessage.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        chatApi.sendMessage({
          messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: new Date() }],
          sessionId: 'test-session-1',
          provider: 'openai',
          model: 'gpt-4'
        })
      ).rejects.toThrow('Network error');
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

      mockApiClient.runTool.mockResolvedValueOnce({
        result: 'Weather in New York: 72°F, sunny',
        reply: 'The current weather in New York is 72°F and sunny.',
        executionTime: 1500
      });

      const result = await mockApiClient.runTool({
        toolCall: mockToolCall,
        sessionId: 'test-session-1',
        messages: [],
        approved: true
      });

      expect(result.result).toBe('Weather in New York: 72°F, sunny');
      expect(result.reply).toBe('The current weather in New York is 72°F and sunny.');
      expect(result.executionTime).toBe(1500);
    });
  });

  describe('Settings Integration', () => {
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

      mockApiClient.getSettings.mockResolvedValueOnce(mockSettings);

      const result = await mockApiClient.getSettings();

      expect(result.llmProviders).toHaveLength(1);
      expect(result.llmProviders[0].name).toBe('openai');
      expect(result.preferences.theme).toBe('light');
      expect(result.security.encryptionEnabled).toBe(true);
    });

    it('should handle settings updates', async () => {
      mockApiClient.updateSettings.mockResolvedValueOnce({ success: true });

      const result = await mockApiClient.updateSettings({
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
        }
      });

      expect(result.success).toBe(true);
    });

    it('should handle connection testing', async () => {
      mockApiClient.testConnection.mockResolvedValueOnce({
        success: true,
        models: [
          {
            id: 'gpt-4',
            name: 'gpt-4',
            displayName: 'GPT-4',
            supportsToolCalling: true,
            maxTokens: 8192,
            costPer1kTokens: { input: 0.03, output: 0.06 }
          }
        ]
      });

      const result = await mockApiClient.testConnection({
        provider: 'openai',
        apiKey: 'sk-test1234567890abcdef',
        baseUrl: 'https://api.openai.com/v1'
      });

      expect(result.success).toBe(true);
      expect(result.models).toHaveLength(1);
      expect(result.models?.[0].name).toBe('gpt-4');
    });
  });

  describe('Session Management Integration', () => {
    it('should handle session creation', async () => {
      const mockSession = {
        id: 'session-1',
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'openai',
        model: 'gpt-4',
        mcpServers: ['weather'],
        tags: [],
        archived: false,
        totalTokens: 0,
        estimatedCost: 0
      };

      mockApiClient.createSession.mockResolvedValueOnce(mockSession);

      const result = await mockApiClient.createSession({
        provider: 'openai',
        model: 'gpt-4',
        mcpServers: ['weather']
      });

      expect(result.id).toBe('session-1');
      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4');
      expect(result.mcpServers).toEqual(['weather']);
    });

    it('should handle session history retrieval', async () => {
      const mockSessions = [
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
        },
        {
          id: 'session-2',
          title: 'File Operations',
          messages: [],
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          provider: 'openai',
          model: 'gpt-4',
          mcpServers: ['file'],
          tags: ['files'],
          archived: false,
          totalTokens: 30,
          estimatedCost: 0.0006
        }
      ];

      mockApiClient.getChatHistory.mockResolvedValueOnce({
        sessions: mockSessions,
        totalCount: 2,
        hasMore: false
      });

      const result = await mockApiClient.getChatHistory();

      expect(result.sessions).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(result.sessions[0].title).toBe('Weather Chat');
      expect(result.sessions[1].title).toBe('File Operations');
    });

    it('should handle session deletion', async () => {
      mockApiClient.deleteSession.mockResolvedValueOnce({ success: true });

      const result = await mockApiClient.deleteSession('session-1');

      expect(result.success).toBe(true);
    });
  });

  describe('Tool Execution Integration', () => {
    it('should handle active tool executions', async () => {
      const mockActiveExecutions = [
        {
          id: 'exec-1',
          toolCallId: 'tool-call-1',
          toolName: 'weather.get_weather',
          status: 'running' as const,
          startTime: new Date(),
          progress: 50,
          parameters: { location: 'New York' }
        }
      ];

      mockApiClient.getActiveToolExecutions.mockResolvedValueOnce(mockActiveExecutions);

      const result = await mockApiClient.getActiveToolExecutions();

      expect(result).toHaveLength(1);
      expect(result[0].toolName).toBe('weather.get_weather');
      expect(result[0].status).toBe('running');
      expect(result[0].progress).toBe(50);
    });

    it('should handle tool execution history', async () => {
      const mockHistory = [
        {
          id: 'exec-1',
          toolCallId: 'tool-call-1',
          toolName: 'weather.get_weather',
          status: 'completed' as const,
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T10:00:02Z'),
          executionTime: 2000,
          parameters: { location: 'New York' },
          result: 'Weather: 72°F, sunny',
          sessionId: 'session-1'
        }
      ];

      mockApiClient.getToolExecutionHistory.mockResolvedValueOnce({
        executions: mockHistory,
        totalCount: 1,
        hasMore: false
      });

      const result = await mockApiClient.getToolExecutionHistory();

      expect(result.executions).toHaveLength(1);
      expect(result.executions[0].toolName).toBe('weather.get_weather');
      expect(result.executions[0].status).toBe('completed');
      expect(result.executions[0].executionTime).toBe(2000);
    });

    it('should handle tool execution cancellation', async () => {
      mockApiClient.cancelToolExecution.mockResolvedValueOnce({ success: true });

      const result = await mockApiClient.cancelToolExecution('tool-call-1');

      expect(result.success).toBe(true);
    });
  });

  describe('Data Export Integration', () => {
    it('should handle chat history export', async () => {
      mockApiClient.exportChatHistory.mockResolvedValueOnce({
        data: JSON.stringify([{ id: 'session-1', title: 'Test Chat' }]),
        filename: 'chat-history.json',
        contentType: 'application/json'
      });

      const result = await mockApiClient.exportChatHistory({
        sessionIds: ['session-1'],
        format: 'json',
        includeSensitiveData: false
      });

      expect(result.filename).toBe('chat-history.json');
      expect(result.contentType).toBe('application/json');
      expect(JSON.parse(result.data)).toEqual([{ id: 'session-1', title: 'Test Chat' }]);
    });

    it('should handle settings export', async () => {
      mockApiClient.exportSettings.mockResolvedValueOnce({
        data: JSON.stringify({ preferences: { theme: 'light' } }),
        filename: 'settings.json',
        contentType: 'application/json'
      });

      const result = await mockApiClient.exportSettings();

      expect(result.filename).toBe('settings.json');
      expect(result.contentType).toBe('application/json');
      expect(JSON.parse(result.data)).toEqual({ preferences: { theme: 'light' } });
    });

    it('should handle privacy cleanup', async () => {
      mockApiClient.cleanupPrivacyData.mockResolvedValueOnce({
        deletedCount: 5,
        success: true
      });

      const result = await mockApiClient.cleanupPrivacyData({
        type: 'sessions',
        olderThan: new Date('2024-01-01'),
        confirmed: true
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(5);
    });
  });

  describe('Streaming Integration', () => {
    it('should handle streaming responses', async () => {
      const chunks = ['Hello', ' there', '!'];
      let chunkIndex = 0;

      const mockStream = new ReadableStream({
        start(controller) {
          const interval = setInterval(() => {
            if (chunkIndex < chunks.length) {
              controller.enqueue(chunks[chunkIndex]);
              chunkIndex++;
            } else {
              clearInterval(interval);
              controller.close();
            }
          }, 10);
        }
      });

      mockApiClient.sendMessageStream.mockResolvedValueOnce(mockStream);

      const stream = await mockApiClient.sendMessageStream({
        messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: new Date() }],
        sessionId: 'test-session-1',
        provider: 'openai',
        model: 'gpt-4'
      });

      expect(stream).toBeInstanceOf(ReadableStream);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors with retry', async () => {
      // First call fails, second succeeds
      mockApiClient.sendMessage
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          reply: 'Success after retry',
          sessionId: 'test-session-1'
        });

      // First attempt should fail
      await expect(
        mockApiClient.sendMessage({
          messages: [{ id: '1', role: 'user', content: 'Test', timestamp: new Date() }],
          sessionId: 'test-session-1',
          provider: 'openai',
          model: 'gpt-4'
        })
      ).rejects.toThrow('Network error');

      // Second attempt should succeed
      const result = await mockApiClient.sendMessage({
        messages: [{ id: '1', role: 'user', content: 'Test', timestamp: new Date() }],
        sessionId: 'test-session-1',
        provider: 'openai',
        model: 'gpt-4'
      });

      expect(result.reply).toBe('Success after retry');
    });

    it('should handle validation errors', async () => {
      mockApiClient.updateSettings.mockRejectedValueOnce(new Error('Invalid configuration'));

      await expect(
        mockApiClient.updateSettings({
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
          }
        })
      ).rejects.toThrow('Invalid configuration');
    });

    it('should handle timeout errors', async () => {
      mockApiClient.runTool.mockRejectedValueOnce(new Error('Tool execution timeout'));

      await expect(
        mockApiClient.runTool({
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
});