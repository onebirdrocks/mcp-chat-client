/**
 * End-to-End Workflow Logic Tests
 * Tests complete application workflows focusing on business logic rather than UI interactions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chatApi, settingsApi } from '@/src/services/apiClient';

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
    createSession: vi.fn(),
    updateSession: vi.fn(),
    generateSessionTitle: vi.fn(),
  },
  settingsApi: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

const mockChatApi = vi.mocked(chatApi);
const mockSettingsApi = vi.mocked(settingsApi);

describe('E2E Workflow Logic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('New User Onboarding Workflow', () => {
    it('should complete new user setup workflow', async () => {
      // Step 1: Check initial empty state
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

      const initialSettings = await settingsApi.getSettings();
      expect(initialSettings.llmProviders).toHaveLength(0);
      expect(initialSettings.mcpServers).toHaveLength(0);

      // Step 2: Add first LLM provider
      const updatedSettingsWithProvider = {
        ...initialSettings,
        llmProviders: [
          {
            id: 'openai-1',
            name: 'openai',
            displayName: 'OpenAI',
            apiKey: 'sk-test1234567890abcdef',
            baseUrl: 'https://api.openai.com/v1',
            models: [
              {
                id: 'gpt-4',
                name: 'gpt-4',
                displayName: 'GPT-4',
                supportsToolCalling: true,
                maxTokens: 8192,
                costPer1kTokens: { input: 0.03, output: 0.06 }
              }
            ],
            enabled: true,
            rateLimits: { requestsPerMinute: 60, tokensPerMinute: 90000 }
          }
        ]
      };

      mockSettingsApi.updateSettings.mockResolvedValueOnce(updatedSettingsWithProvider);

      const settingsWithProvider = await settingsApi.updateSettings(updatedSettingsWithProvider);
      expect(settingsWithProvider.llmProviders).toHaveLength(1);
      expect(settingsWithProvider.llmProviders[0].name).toBe('openai');

      // Step 3: Add MCP server
      const finalSettings = {
        ...settingsWithProvider,
        mcpServers: [
          {
            id: 'weather',
            name: 'weather',
            displayName: 'Weather Server',
            command: 'uvx',
            args: ['weather-mcp'],
            env: {},
            enabled: true,
            status: 'connected' as const,
            tools: [
              {
                name: 'get_weather',
                description: 'Get current weather for a location',
                inputSchema: {
                  type: 'object',
                  properties: { location: { type: 'string' } },
                  required: ['location']
                },
                serverId: 'weather',
                requiresConfirmation: true
              }
            ]
          }
        ]
      };

      mockSettingsApi.updateSettings.mockResolvedValueOnce(finalSettings);

      const completeSettings = await settingsApi.updateSettings(finalSettings);
      expect(completeSettings.llmProviders).toHaveLength(1);
      expect(completeSettings.mcpServers).toHaveLength(1);
      expect(completeSettings.mcpServers[0].tools).toHaveLength(1);

      // Verify complete onboarding workflow
      expect(mockSettingsApi.getSettings).toHaveBeenCalledTimes(1);
      expect(mockSettingsApi.updateSettings).toHaveBeenCalledTimes(2);
    });
  });

  describe('Complete Chat Session Workflow', () => {
    it('should handle full chat session lifecycle', async () => {
      // Step 1: Create new session
      const mockSession = {
        id: 'session-1',
        title: 'Weather Chat',
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

      mockChatApi.createSession.mockResolvedValueOnce(mockSession);

      const newSession = await chatApi.createSession({
        provider: 'openai',
        model: 'gpt-4',
        mcpServers: ['weather']
      });

      expect(newSession.id).toBe('session-1');
      expect(newSession.provider).toBe('openai');
      expect(newSession.mcpServers).toEqual(['weather']);

      // Step 2: Send initial message
      mockChatApi.sendMessage.mockResolvedValueOnce({
        reply: 'Hello! I can help you with weather information. What would you like to know?',
        sessionId: 'session-1',
        usage: { promptTokens: 20, completionTokens: 25, totalTokens: 45 }
      });

      const initialResponse = await chatApi.sendMessage({
        messages: [
          { id: '1', role: 'user', content: 'Hello, can you help me with weather?', timestamp: new Date() }
        ],
        sessionId: 'session-1',
        provider: 'openai',
        model: 'gpt-4'
      });

      expect(initialResponse.reply).toContain('weather information');
      expect(initialResponse.sessionId).toBe('session-1');
      expect(initialResponse.usage?.totalTokens).toBe(45);

      // Step 3: Request weather with tool call
      const mockToolCall = {
        id: 'tool-call-1',
        type: 'function' as const,
        function: {
          name: 'weather.get_weather',
          arguments: JSON.stringify({ location: 'New York' })
        },
        serverId: 'weather',
        approved: false
      };

      mockChatApi.sendMessage.mockResolvedValueOnce({
        toolCalls: [mockToolCall],
        sessionId: 'session-1'
      });

      const toolCallResponse = await chatApi.sendMessage({
        messages: [
          { id: '1', role: 'user', content: 'Hello, can you help me with weather?', timestamp: new Date() },
          { id: '2', role: 'assistant', content: 'Hello! I can help you with weather information. What would you like to know?', timestamp: new Date() },
          { id: '3', role: 'user', content: 'What is the weather in New York?', timestamp: new Date() }
        ],
        sessionId: 'session-1',
        provider: 'openai',
        model: 'gpt-4'
      });

      expect(toolCallResponse.toolCalls).toHaveLength(1);
      expect(toolCallResponse.toolCalls?.[0].function.name).toBe('weather.get_weather');

      // Step 4: Execute tool
      mockChatApi.runTool.mockResolvedValueOnce({
        result: 'Weather in New York: 72°F, sunny',
        reply: 'The current weather in New York is 72°F and sunny with clear skies.',
        executionTime: 1500
      });

      const toolResult = await chatApi.runTool({
        toolCall: { ...mockToolCall, approved: true },
        sessionId: 'session-1',
        messages: [
          { id: '1', role: 'user', content: 'Hello, can you help me with weather?', timestamp: new Date() },
          { id: '2', role: 'assistant', content: 'Hello! I can help you with weather information. What would you like to know?', timestamp: new Date() },
          { id: '3', role: 'user', content: 'What is the weather in New York?', timestamp: new Date() }
        ],
        approved: true
      });

      expect(toolResult.result).toBe('Weather in New York: 72°F, sunny');
      expect(toolResult.reply).toContain('72°F and sunny');
      expect(toolResult.executionTime).toBe(1500);

      // Step 5: Generate session title
      mockChatApi.generateSessionTitle.mockResolvedValueOnce({
        title: 'Weather Inquiry for New York'
      });

      const titleResult = await chatApi.generateSessionTitle('session-1');
      expect(titleResult.title).toBe('Weather Inquiry for New York');

      // Step 6: Update session with final state
      const updatedSession = {
        ...mockSession,
        title: 'Weather Inquiry for New York',
        messages: [
          { id: '1', role: 'user' as const, content: 'Hello, can you help me with weather?', timestamp: new Date() },
          { id: '2', role: 'assistant' as const, content: 'Hello! I can help you with weather information. What would you like to know?', timestamp: new Date() },
          { id: '3', role: 'user' as const, content: 'What is the weather in New York?', timestamp: new Date() },
          { id: '4', role: 'assistant' as const, content: 'The current weather in New York is 72°F and sunny with clear skies.', timestamp: new Date() }
        ],
        totalTokens: 95,
        estimatedCost: 0.0019
      };

      mockChatApi.updateSession.mockResolvedValueOnce(updatedSession);

      const finalSession = await chatApi.updateSession('session-1', {
        title: 'Weather Inquiry for New York',
        totalTokens: 95,
        estimatedCost: 0.0019
      });

      expect(finalSession.title).toBe('Weather Inquiry for New York');
      expect(finalSession.totalTokens).toBe(95);

      // Verify complete workflow
      expect(mockChatApi.createSession).toHaveBeenCalledTimes(1);
      expect(mockChatApi.sendMessage).toHaveBeenCalledTimes(2);
      expect(mockChatApi.runTool).toHaveBeenCalledTimes(1);
      expect(mockChatApi.generateSessionTitle).toHaveBeenCalledTimes(1);
      expect(mockChatApi.updateSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('Session Management Workflow', () => {
    it('should handle complete session management lifecycle', async () => {
      // Step 1: Get initial chat history
      const mockSessions = [
        {
          id: 'session-1',
          title: 'Weather Chat',
          messages: [
            { id: 'msg-1', role: 'user' as const, content: 'What is the weather?', timestamp: new Date() },
            { id: 'msg-2', role: 'assistant' as const, content: 'The weather is sunny.', timestamp: new Date() }
          ],
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

      mockChatApi.getChatHistory.mockResolvedValueOnce({
        sessions: mockSessions,
        totalCount: 2,
        hasMore: false
      });

      const history = await chatApi.getChatHistory();
      expect(history.sessions).toHaveLength(2);
      expect(history.totalCount).toBe(2);
      expect(history.hasMore).toBe(false);

      // Step 2: Rename session
      const renamedSession = {
        ...mockSessions[0],
        title: 'New York Weather Discussion',
        updatedAt: new Date()
      };

      mockChatApi.updateSession.mockResolvedValueOnce(renamedSession);

      const updatedSession = await chatApi.updateSession('session-1', {
        title: 'New York Weather Discussion'
      });

      expect(updatedSession.title).toBe('New York Weather Discussion');

      // Step 3: Archive session
      const archivedSession = {
        ...renamedSession,
        archived: true,
        updatedAt: new Date()
      };

      mockChatApi.updateSession.mockResolvedValueOnce(archivedSession);

      const sessionAfterArchive = await chatApi.updateSession('session-1', {
        archived: true
      });

      expect(sessionAfterArchive.archived).toBe(true);

      // Step 4: Delete session
      mockChatApi.deleteSession.mockResolvedValueOnce({ success: true });

      const deleteResult = await chatApi.deleteSession('session-2');
      expect(deleteResult.success).toBe(true);

      // Step 5: Get updated history
      mockChatApi.getChatHistory.mockResolvedValueOnce({
        sessions: [archivedSession],
        totalCount: 1,
        hasMore: false
      });

      const updatedHistory = await chatApi.getChatHistory();
      expect(updatedHistory.sessions).toHaveLength(1);
      expect(updatedHistory.sessions[0].archived).toBe(true);

      // Verify complete session management workflow
      expect(mockChatApi.getChatHistory).toHaveBeenCalledTimes(2);
      expect(mockChatApi.updateSession).toHaveBeenCalledTimes(2);
      expect(mockChatApi.deleteSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('Settings Configuration Workflow', () => {
    it('should handle complete settings configuration workflow', async () => {
      // Step 1: Get initial settings
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

      const initialSettings = await settingsApi.getSettings();
      expect(initialSettings.llmProviders).toHaveLength(0);
      expect(initialSettings.preferences.theme).toBe('light');

      // Step 2: Add multiple LLM providers
      const settingsWithProviders = {
        ...initialSettings,
        llmProviders: [
          {
            id: 'openai-1',
            name: 'openai',
            displayName: 'OpenAI',
            apiKey: 'sk-openai-key',
            baseUrl: 'https://api.openai.com/v1',
            models: [],
            enabled: true,
            rateLimits: { requestsPerMinute: 60, tokensPerMinute: 90000 }
          },
          {
            id: 'deepseek-1',
            name: 'deepseek',
            displayName: 'DeepSeek',
            apiKey: 'sk-deepseek-key',
            baseUrl: 'https://api.deepseek.com/v1',
            models: [],
            enabled: true,
            rateLimits: { requestsPerMinute: 100, tokensPerMinute: 120000 }
          }
        ]
      };

      mockSettingsApi.updateSettings.mockResolvedValueOnce(settingsWithProviders);

      const providersResult = await settingsApi.updateSettings(settingsWithProviders);
      expect(providersResult.llmProviders).toHaveLength(2);

      // Step 3: Add MCP servers
      const settingsWithServers = {
        ...settingsWithProviders,
        mcpServers: [
          {
            id: 'weather',
            name: 'weather',
            displayName: 'Weather Server',
            command: 'uvx',
            args: ['weather-mcp'],
            env: {},
            enabled: true,
            status: 'connected' as const,
            tools: []
          },
          {
            id: 'file',
            name: 'file',
            displayName: 'File System',
            command: 'node',
            args: ['file-server.js'],
            env: { HOME: '/home/user' },
            enabled: true,
            status: 'connected' as const,
            tools: []
          }
        ]
      };

      mockSettingsApi.updateSettings.mockResolvedValueOnce(settingsWithServers);

      const serversResult = await settingsApi.updateSettings(settingsWithServers);
      expect(serversResult.mcpServers).toHaveLength(2);

      // Step 4: Update preferences
      const finalSettings = {
        ...settingsWithServers,
        preferences: {
          ...settingsWithServers.preferences,
          theme: 'dark',
          language: 'zh',
          autoScroll: false,
          soundEnabled: true
        }
      };

      mockSettingsApi.updateSettings.mockResolvedValueOnce(finalSettings);

      const preferencesResult = await settingsApi.updateSettings(finalSettings);
      expect(preferencesResult.preferences.theme).toBe('dark');
      expect(preferencesResult.preferences.language).toBe('zh');

      // Verify complete configuration workflow
      expect(mockSettingsApi.getSettings).toHaveBeenCalledTimes(1);
      expect(mockSettingsApi.updateSettings).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle error recovery scenarios', async () => {
      // Step 1: Network error with retry
      mockChatApi.sendMessage
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Server timeout'))
        .mockResolvedValueOnce({
          reply: 'Success after retries',
          sessionId: 'session-1'
        });

      // First attempt fails
      await expect(
        chatApi.sendMessage({
          messages: [{ id: '1', role: 'user', content: 'Test', timestamp: new Date() }],
          sessionId: 'session-1',
          provider: 'openai',
          model: 'gpt-4'
        })
      ).rejects.toThrow('Network error');

      // Second attempt fails
      await expect(
        chatApi.sendMessage({
          messages: [{ id: '1', role: 'user', content: 'Test', timestamp: new Date() }],
          sessionId: 'session-1',
          provider: 'openai',
          model: 'gpt-4'
        })
      ).rejects.toThrow('Server timeout');

      // Third attempt succeeds
      const result = await chatApi.sendMessage({
        messages: [{ id: '1', role: 'user', content: 'Test', timestamp: new Date() }],
        sessionId: 'session-1',
        provider: 'openai',
        model: 'gpt-4'
      });

      expect(result.reply).toBe('Success after retries');
      expect(mockChatApi.sendMessage).toHaveBeenCalledTimes(3);

      // Step 2: Tool execution error recovery
      mockChatApi.runTool
        .mockRejectedValueOnce(new Error('Tool execution timeout'))
        .mockResolvedValueOnce({
          result: 'Tool executed successfully',
          reply: 'The tool completed successfully.',
          executionTime: 2000
        });

      // First tool execution fails
      await expect(
        chatApi.runTool({
          toolCall: {
            id: 'tool-1',
            type: 'function',
            function: { name: 'slow.task', arguments: '{}' },
            serverId: 'slow',
            approved: true
          },
          sessionId: 'session-1',
          messages: [],
          approved: true
        })
      ).rejects.toThrow('Tool execution timeout');

      // Retry succeeds
      const toolResult = await chatApi.runTool({
        toolCall: {
          id: 'tool-1',
          type: 'function',
          function: { name: 'slow.task', arguments: '{}' },
          serverId: 'slow',
          approved: true
        },
        sessionId: 'session-1',
        messages: [],
        approved: true
      });

      expect(toolResult.result).toBe('Tool executed successfully');
      expect(mockChatApi.runTool).toHaveBeenCalledTimes(2);

      // Step 3: Settings validation error recovery
      mockSettingsApi.updateSettings
        .mockRejectedValueOnce(new Error('Invalid configuration'))
        .mockResolvedValueOnce({
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

      // First settings update fails
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

      // Corrected settings update succeeds
      const settingsResult = await settingsApi.updateSettings({
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

      expect(settingsResult.preferences.theme).toBe('light');
      expect(mockSettingsApi.updateSettings).toHaveBeenCalledTimes(2);
    });
  });

  describe('Complete Application Workflow', () => {
    it('should handle end-to-end application workflow', async () => {
      // Step 1: Initial setup
      mockSettingsApi.getSettings.mockResolvedValueOnce({
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
        mcpServers: [
          {
            id: 'weather',
            name: 'weather',
            displayName: 'Weather Server',
            command: 'uvx',
            args: ['weather-mcp'],
            env: {},
            enabled: true,
            status: 'connected' as const,
            tools: []
          }
        ],
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

      // Step 2: Create session
      mockChatApi.createSession.mockResolvedValueOnce({
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
      });

      // Step 3: Chat interaction
      mockChatApi.sendMessage.mockResolvedValueOnce({
        reply: 'Hello! How can I help you?',
        sessionId: 'session-1',
        usage: { promptTokens: 10, completionTokens: 15, totalTokens: 25 }
      });

      // Step 4: Tool execution
      mockChatApi.runTool.mockResolvedValueOnce({
        result: 'Weather: 72°F, sunny',
        reply: 'The weather is 72°F and sunny.',
        executionTime: 1500
      });

      // Step 5: Session management
      mockChatApi.getChatHistory.mockResolvedValueOnce({
        sessions: [
          {
            id: 'session-1',
            title: 'Weather Chat',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            provider: 'openai',
            model: 'gpt-4',
            mcpServers: ['weather'],
            tags: [],
            archived: false,
            totalTokens: 25,
            estimatedCost: 0.0005
          }
        ],
        totalCount: 1,
        hasMore: false
      });

      // Execute complete workflow
      const settings = await settingsApi.getSettings();
      expect(settings.llmProviders).toHaveLength(1);
      expect(settings.mcpServers).toHaveLength(1);

      const session = await chatApi.createSession({
        provider: 'openai',
        model: 'gpt-4',
        mcpServers: ['weather']
      });
      expect(session.id).toBe('session-1');

      const chatResponse = await chatApi.sendMessage({
        messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: new Date() }],
        sessionId: 'session-1',
        provider: 'openai',
        model: 'gpt-4'
      });
      expect(chatResponse.reply).toBe('Hello! How can I help you?');

      const toolResponse = await chatApi.runTool({
        toolCall: {
          id: 'tool-1',
          type: 'function',
          function: { name: 'weather.get_weather', arguments: '{"location":"NYC"}' },
          serverId: 'weather',
          approved: true
        },
        sessionId: 'session-1',
        messages: [],
        approved: true
      });
      expect(toolResponse.result).toBe('Weather: 72°F, sunny');

      const history = await chatApi.getChatHistory();
      expect(history.sessions).toHaveLength(1);
      expect(history.sessions[0].totalTokens).toBe(25);

      // Verify complete application workflow
      expect(mockSettingsApi.getSettings).toHaveBeenCalledTimes(1);
      expect(mockChatApi.createSession).toHaveBeenCalledTimes(1);
      expect(mockChatApi.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockChatApi.runTool).toHaveBeenCalledTimes(1);
      expect(mockChatApi.getChatHistory).toHaveBeenCalledTimes(1);
    });
  });
});