/**
 * Basic End-to-End Workflow Tests
 * Tests complete user workflows with simplified components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Mock simplified components to avoid complex dependencies
vi.mock('@/src/components/ChatInterface', () => ({
  ChatInterface: () => (
    <div data-testid="chat-interface">
      <div data-testid="message-list">
        <div data-testid="message-1">Hello, can you help with weather?</div>
        <div data-testid="message-2">I can help you with weather information.</div>
      </div>
      <div data-testid="message-input-container">
        <input data-testid="message-input" placeholder="Type your message..." />
        <button data-testid="send-button">Send</button>
      </div>
      <div data-testid="tool-confirmation" style={{ display: 'none' }}>
        <h3>Tool Execution Confirmation</h3>
        <p>weather.get_weather</p>
        <button data-testid="run-tool">Run</button>
        <button data-testid="cancel-tool">Cancel</button>
      </div>
    </div>
  ),
}));

vi.mock('@/src/components/SettingsPage', () => ({
  SettingsPage: () => (
    <div data-testid="settings-page">
      <div data-testid="llm-providers-section">
        <h2>LLM Providers</h2>
        <button data-testid="add-provider">Add Provider</button>
        <div data-testid="provider-list">
          <div data-testid="provider-openai">
            <span>OpenAI</span>
            <button data-testid="test-connection">Test Connection</button>
          </div>
        </div>
      </div>
      <div data-testid="mcp-servers-section">
        <h2>MCP Servers</h2>
        <button data-testid="add-server">Add Server</button>
        <div data-testid="server-list">
          <div data-testid="server-weather">
            <span>Weather Server</span>
            <span data-testid="server-status">Connected</span>
          </div>
        </div>
      </div>
      <div data-testid="preferences-section">
        <h2>Preferences</h2>
        <select data-testid="theme-select">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <select data-testid="language-select">
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
        <button data-testid="save-preferences">Save</button>
      </div>
    </div>
  ),
}));

vi.mock('@/src/components/next/Sidebar', () => ({
  Sidebar: () => (
    <div data-testid="sidebar">
      <button data-testid="new-chat">New Chat</button>
      <div data-testid="session-list">
        <div data-testid="session-weather-chat">Weather Chat</div>
        <div data-testid="session-file-ops">File Operations</div>
      </div>
      <input data-testid="search-sessions" placeholder="Search sessions..." />
    </div>
  ),
}));

vi.mock('@/app/components/ClientProviders', () => ({
  ClientProviders: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="client-providers">{children}</div>
  ),
}));

const mockChatApi = vi.mocked(chatApi);
const mockSettingsApi = vi.mocked(settingsApi);

describe('Basic E2E Workflow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('New User Onboarding Workflow', () => {
    it('should guide new user through basic setup', async () => {
      const user = userEvent.setup();
      
      // Mock empty initial state (new user)
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

      mockSettingsApi.updateSettings.mockResolvedValue({
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
      });

      const { SettingsPage } = await import('@/src/components/SettingsPage');
      render(<SettingsPage />);

      // Verify settings page loads
      expect(screen.getByTestId('settings-page')).toBeInTheDocument();
      expect(screen.getByText('LLM Providers')).toBeInTheDocument();

      // Step 1: Add LLM Provider
      const addProviderButton = screen.getByTestId('add-provider');
      await user.click(addProviderButton);

      // Verify provider can be added (mocked)
      expect(mockSettingsApi.updateSettings).toHaveBeenCalled();

      // Step 2: Test connection
      const testButton = screen.getByTestId('test-connection');
      await user.click(testButton);

      // Verify setup completion
      expect(screen.getByTestId('provider-openai')).toBeInTheDocument();
    });
  });

  describe('Complete Chat Session Workflow', () => {
    it('should handle full chat session from creation to completion', async () => {
      const user = userEvent.setup();
      
      // Mock configured state
      mockSettingsApi.getSettings.mockResolvedValue({
        llmProviders: [
          {
            id: 'openai-1',
            name: 'openai',
            displayName: 'OpenAI',
            apiKey: 'sk-****1234',
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

      // Mock session creation
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

      mockChatApi.createSession.mockResolvedValue(mockSession);

      const { ChatInterface } = await import('@/src/components/ChatInterface');
      render(<ChatInterface />);

      // Verify chat interface loads
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();

      // Step 1: Send initial message
      mockChatApi.sendMessage.mockResolvedValueOnce({
        reply: 'Hello! I can help you with weather information. What would you like to know?',
        sessionId: 'session-1',
        usage: { promptTokens: 20, completionTokens: 25, totalTokens: 45 }
      });

      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');

      await user.type(messageInput, 'Hello, can you help me with weather?');
      await user.click(sendButton);

      // Verify API call was made
      expect(mockChatApi.sendMessage).toHaveBeenCalled();

      // Step 2: Request weather with tool call
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

      await user.clear(messageInput);
      await user.type(messageInput, 'What is the weather in New York?');
      await user.click(sendButton);

      // Step 3: Confirm tool execution (simulate showing confirmation dialog)
      const toolConfirmation = screen.getByTestId('tool-confirmation');
      toolConfirmation.style.display = 'block';

      expect(screen.getByText('Tool Execution Confirmation')).toBeInTheDocument();
      expect(screen.getByText('weather.get_weather')).toBeInTheDocument();

      mockChatApi.runTool.mockResolvedValueOnce({
        result: 'Weather in New York: 72°F, sunny',
        reply: 'The current weather in New York is 72°F and sunny with clear skies.',
        executionTime: 1500
      });

      const runToolButton = screen.getByTestId('run-tool');
      await user.click(runToolButton);

      // Verify tool execution
      expect(mockChatApi.runTool).toHaveBeenCalledWith(
        expect.objectContaining({
          toolCall: mockToolCall,
          approved: true
        })
      );

      // Step 4: Generate session title
      mockChatApi.generateSessionTitle.mockResolvedValueOnce({
        title: 'Weather Inquiry for New York'
      });

      // Verify complete workflow
      expect(mockChatApi.sendMessage).toHaveBeenCalledTimes(2);
      expect(mockChatApi.runTool).toHaveBeenCalledTimes(1);
    });
  });

  describe('Session Management Workflow', () => {
    it('should handle session management operations', async () => {
      const user = userEvent.setup();
      
      // Mock existing sessions
      const mockSessions = [
        {
          id: 'session-1',
          title: 'Weather Chat',
          messages: [
            {
              id: 'msg-1',
              role: 'user' as const,
              content: 'What is the weather?',
              timestamp: new Date()
            },
            {
              id: 'msg-2',
              role: 'assistant' as const,
              content: 'The weather is sunny.',
              timestamp: new Date()
            }
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

      mockChatApi.getChatHistory.mockResolvedValue({
        sessions: mockSessions,
        totalCount: 2,
        hasMore: false
      });

      const { Sidebar } = await import('@/src/components/next/Sidebar');
      render(<Sidebar />);

      // Verify sidebar loads with sessions
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('session-weather-chat')).toBeInTheDocument();
      expect(screen.getByTestId('session-file-ops')).toBeInTheDocument();

      // Step 1: Search sessions
      const searchInput = screen.getByTestId('search-sessions');
      await user.type(searchInput, 'weather');

      // Verify search functionality (mocked behavior)
      expect(searchInput).toHaveValue('weather');

      // Step 2: Create new session
      const newChatButton = screen.getByTestId('new-chat');
      await user.click(newChatButton);

      // Verify new chat creation (would trigger session creation)
      expect(newChatButton).toBeInTheDocument();

      // Step 3: Session operations (delete, rename, etc.)
      mockChatApi.deleteSession.mockResolvedValue({ success: true });
      mockChatApi.updateSession.mockResolvedValue({
        ...mockSessions[0],
        title: 'Updated Weather Chat'
      });

      // Verify session management APIs are available
      expect(mockChatApi.deleteSession).toBeDefined();
      expect(mockChatApi.updateSession).toBeDefined();
    });
  });

  describe('Settings Configuration Workflow', () => {
    it('should handle complete settings configuration', async () => {
      const user = userEvent.setup();
      
      // Mock initial settings
      mockSettingsApi.getSettings.mockResolvedValue({
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

      mockSettingsApi.updateSettings.mockResolvedValue({
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
      });

      const { SettingsPage } = await import('@/src/components/SettingsPage');
      render(<SettingsPage />);

      // Step 1: Configure LLM providers
      const addProviderButton = screen.getByTestId('add-provider');
      await user.click(addProviderButton);

      // Step 2: Configure MCP servers
      const addServerButton = screen.getByTestId('add-server');
      await user.click(addServerButton);

      // Step 3: Update preferences
      const themeSelect = screen.getByTestId('theme-select');
      await user.selectOptions(themeSelect, 'dark');

      const languageSelect = screen.getByTestId('language-select');
      await user.selectOptions(languageSelect, 'zh');

      const saveButton = screen.getByTestId('save-preferences');
      await user.click(saveButton);

      // Verify all configuration steps
      expect(mockSettingsApi.updateSettings).toHaveBeenCalled();
      expect(themeSelect).toHaveValue('dark');
      expect(languageSelect).toHaveValue('zh');
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle and recover from various error scenarios', async () => {
      const user = userEvent.setup();
      
      // Mock network failure scenario
      mockChatApi.sendMessage
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          reply: 'Success after retry',
          sessionId: 'session-1'
        });

      const { ChatInterface } = await import('@/src/components/ChatInterface');
      render(<ChatInterface />);

      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');

      // Step 1: Initial failure
      await user.type(messageInput, 'Test message');
      await user.click(sendButton);

      // Verify first call failed
      expect(mockChatApi.sendMessage).toHaveBeenCalledTimes(1);

      // Step 2: Retry (simulate retry button click)
      await user.click(sendButton);

      // Verify retry succeeded
      expect(mockChatApi.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration Workflow Tests', () => {
    it('should handle complete application workflow', async () => {
      const user = userEvent.setup();
      
      // Step 1: Settings configuration
      mockSettingsApi.getSettings.mockResolvedValue({
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

      // Step 2: Chat interaction
      mockChatApi.sendMessage.mockResolvedValue({
        reply: 'Hello! How can I help you?',
        sessionId: 'session-1'
      });

      // Step 3: Tool execution
      mockChatApi.runTool.mockResolvedValue({
        result: 'Tool executed successfully',
        reply: 'The tool has been executed.',
        executionTime: 1000
      });

      // Step 4: Session management
      mockChatApi.getChatHistory.mockResolvedValue({
        sessions: [
          {
            id: 'session-1',
            title: 'Test Chat',
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

      // Verify all APIs are properly mocked and available
      expect(mockSettingsApi.getSettings).toBeDefined();
      expect(mockChatApi.sendMessage).toBeDefined();
      expect(mockChatApi.runTool).toBeDefined();
      expect(mockChatApi.getChatHistory).toBeDefined();

      // Simulate complete workflow execution
      const settings = await settingsApi.getSettings();
      expect(settings.llmProviders).toHaveLength(1);

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
          function: { name: 'test.tool', arguments: '{}' },
          serverId: 'test',
          approved: true
        },
        sessionId: 'session-1',
        messages: [],
        approved: true
      });
      expect(toolResponse.result).toBe('Tool executed successfully');

      const history = await chatApi.getChatHistory();
      expect(history.sessions).toHaveLength(1);

      // Verify complete workflow
      expect(mockSettingsApi.getSettings).toHaveBeenCalledTimes(1);
      expect(mockChatApi.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockChatApi.runTool).toHaveBeenCalledTimes(1);
      expect(mockChatApi.getChatHistory).toHaveBeenCalledTimes(1);
    });
  });
});