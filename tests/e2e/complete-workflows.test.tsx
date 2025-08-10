/**
 * End-to-end tests for complete application workflows
 * Tests full user journeys from start to finish
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientProviders } from '@/app/components/ClientProviders';
import { ChatInterface } from '@/src/components/ChatInterface';
import { SettingsPage } from '@/src/components/SettingsPage';
import { Sidebar } from '@/src/components/next/Sidebar';
import { useChatStore } from '@/src/store/chatStore';
import { useChatSessions } from '@/src/hooks/useChatSessions';
import * as apiClient from '@/src/services/apiClient';

// Mock API client
vi.mock('@/src/services/apiClient');
const mockApiClient = vi.mocked(apiClient);

// Mock stores and hooks
vi.mock('@/src/store/chatStore');
vi.mock('@/src/hooks/useChatSessions');

const mockUseChatStore = vi.mocked(useChatStore);
const mockUseChatSessions = vi.mocked(useChatSessions);

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/chat',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Complete Application Workflows E2E Tests', () => {
  const mockChatStore = {
    messages: [],
    isLoading: false,
    error: null,
    currentSession: null,
    pendingToolCall: null,
    streamingMessage: '',
    sendMessage: vi.fn(),
    confirmToolCall: vi.fn(),
    cancelToolCall: vi.fn(),
    clearError: vi.fn(),
    setCurrentSession: vi.fn(),
    addMessage: vi.fn(),
    updateMessage: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    setPendingToolCall: vi.fn(),
    setStreamingMessage: vi.fn(),
    createNewSession: vi.fn(),
    loadSession: vi.fn(),
    deleteSession: vi.fn(),
    renameSession: vi.fn(),
    archiveSession: vi.fn(),
  };

  const mockSessionsHook = {
    sessions: [],
    isLoading: false,
    error: null,
    createSession: vi.fn(),
    loadSession: vi.fn(),
    deleteSession: vi.fn(),
    renameSession: vi.fn(),
    archiveSession: vi.fn(),
    searchSessions: vi.fn(),
    refreshSessions: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChatStore.mockReturnValue(mockChatStore);
    mockUseChatSessions.mockReturnValue(mockSessionsHook);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const renderFullApp = () => {
    return render(
      <ClientProviders>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1">
            <ChatInterface />
          </div>
        </div>
      </ClientProviders>
    );
  };

  describe('New User Onboarding Workflow', () => {
    it('should guide new user through complete setup', async () => {
      const user = userEvent.setup();
      
      // Mock empty initial state (new user)
      mockApiClient.getSettings.mockResolvedValueOnce({
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

      mockApiClient.updateSettings.mockResolvedValue({ success: true });
      mockApiClient.testConnection.mockResolvedValue({
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

      renderFullApp();

      // Should show setup prompt for new user
      await waitFor(() => {
        expect(screen.getByText(/welcome to mcp chat ui/i)).toBeInTheDocument();
        expect(screen.getByText(/let's get you started/i)).toBeInTheDocument();
      });

      // Step 1: Configure LLM Provider
      const setupButton = screen.getByRole('button', { name: /start setup/i });
      await user.click(setupButton);

      // Should navigate to settings
      await waitFor(() => {
        expect(screen.getByText(/llm providers/i)).toBeInTheDocument();
      });

      // Add OpenAI provider
      const addProviderButton = screen.getByRole('button', { name: /add provider/i });
      await user.click(addProviderButton);

      const providerSelect = screen.getByLabelText(/provider type/i);
      await user.selectOptions(providerSelect, 'openai');

      const apiKeyInput = screen.getByLabelText(/api key/i);
      await user.type(apiKeyInput, 'sk-test1234567890abcdef');

      const saveProviderButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveProviderButton);

      // Test connection
      const testButton = screen.getByRole('button', { name: /test connection/i });
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/connection successful/i)).toBeInTheDocument();
      });

      // Step 2: Configure MCP Server (optional)
      const mcpTab = screen.getByRole('tab', { name: /mcp servers/i });
      await user.click(mcpTab);

      const addServerButton = screen.getByRole('button', { name: /add server/i });
      await user.click(addServerButton);

      const serverNameInput = screen.getByLabelText(/server name/i);
      await user.type(serverNameInput, 'weather');

      const commandInput = screen.getByLabelText(/command/i);
      await user.type(commandInput, 'uvx');

      const argsInput = screen.getByLabelText(/arguments/i);
      await user.type(argsInput, 'weather-mcp');

      const saveServerButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveServerButton);

      // Step 3: Complete setup
      const completeSetupButton = screen.getByRole('button', { name: /complete setup/i });
      await user.click(completeSetupButton);

      // Should navigate back to chat
      await waitFor(() => {
        expect(screen.getByText(/ready to chat/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
      });

      // Verify all setup calls were made
      expect(mockApiClient.updateSettings).toHaveBeenCalledTimes(2); // Provider + Server
      expect(mockApiClient.testConnection).toHaveBeenCalledTimes(1);
    });
  });

  describe('Complete Chat Session Workflow', () => {
    it('should handle full chat session from creation to completion', async () => {
      const user = userEvent.setup();
      
      // Mock configured state
      const mockProviders = [
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
      ];

      const mockServers = [
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
      ];

      mockApiClient.getSettings.mockResolvedValue({
        llmProviders: mockProviders,
        mcpServers: mockServers,
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

      mockApiClient.createSession.mockResolvedValue(mockSession);
      mockSessionsHook.createSession.mockResolvedValue(mockSession);
      mockSessionsHook.sessions = [mockSession];

      renderFullApp();

      // Step 1: Create new chat session
      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      await user.click(newChatButton);

      // Select provider and model
      const providerSelect = screen.getByLabelText(/provider/i);
      await user.selectOptions(providerSelect, 'openai');

      const modelSelect = screen.getByLabelText(/model/i);
      await user.selectOptions(modelSelect, 'gpt-4');

      // Select MCP servers
      const weatherCheckbox = screen.getByLabelText(/weather server/i);
      await user.click(weatherCheckbox);

      const createSessionButton = screen.getByRole('button', { name: /create session/i });
      await user.click(createSessionButton);

      // Verify session creation
      await waitFor(() => {
        expect(mockSessionsHook.createSession).toHaveBeenCalledWith({
          provider: 'openai',
          model: 'gpt-4',
          mcpServers: ['weather']
        });
      });

      // Step 2: Send initial message
      mockApiClient.sendMessage.mockResolvedValueOnce({
        reply: 'Hello! I can help you with weather information. What would you like to know?',
        sessionId: 'session-1',
        usage: { promptTokens: 20, completionTokens: 25, totalTokens: 45 }
      });

      const messageInput = screen.getByPlaceholderText(/type your message/i);
      await user.type(messageInput, 'Hello, can you help me with weather?');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Wait for response
      await waitFor(() => {
        expect(screen.getByText(/i can help you with weather information/i)).toBeInTheDocument();
      });

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

      mockApiClient.sendMessage.mockResolvedValueOnce({
        toolCalls: [mockToolCall],
        sessionId: 'session-1'
      });

      await user.clear(messageInput);
      await user.type(messageInput, 'What is the weather in New York?');
      await user.click(sendButton);

      // Step 4: Confirm tool execution
      await waitFor(() => {
        expect(screen.getByText(/tool execution confirmation/i)).toBeInTheDocument();
        expect(screen.getByText('weather.get_weather')).toBeInTheDocument();
      });

      mockApiClient.runTool.mockResolvedValueOnce({
        result: 'Weather in New York: 72°F, sunny',
        reply: 'The current weather in New York is 72°F and sunny with clear skies.',
        executionTime: 1500
      });

      const runToolButton = screen.getByRole('button', { name: /run/i });
      await user.click(runToolButton);

      // Wait for tool execution and response
      await waitFor(() => {
        expect(screen.getByText(/72°F and sunny with clear skies/i)).toBeInTheDocument();
      });

      // Step 5: Continue conversation
      mockApiClient.sendMessage.mockResolvedValueOnce({
        reply: 'Is there anything else you would like to know about the weather?',
        sessionId: 'session-1',
        usage: { promptTokens: 15, completionTokens: 20, totalTokens: 35 }
      });

      await user.clear(messageInput);
      await user.type(messageInput, 'Thank you, that\'s all I needed!');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/anything else you would like to know/i)).toBeInTheDocument();
      });

      // Step 6: Generate session title
      mockApiClient.generateSessionTitle.mockResolvedValueOnce({
        title: 'Weather Inquiry for New York'
      });

      // Title should be auto-generated
      await waitFor(() => {
        expect(screen.getByText('Weather Inquiry for New York')).toBeInTheDocument();
      });

      // Verify complete workflow
      expect(mockApiClient.sendMessage).toHaveBeenCalledTimes(3);
      expect(mockApiClient.runTool).toHaveBeenCalledTimes(1);
      expect(mockApiClient.generateSessionTitle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Session Management Workflow', () => {
    it('should handle complete session management lifecycle', async () => {
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

      mockSessionsHook.sessions = mockSessions;
      mockApiClient.getChatHistory.mockResolvedValue({
        sessions: mockSessions,
        totalCount: 2,
        hasMore: false
      });

      renderFullApp();

      // Step 1: View session history
      await waitFor(() => {
        expect(screen.getByText('Weather Chat')).toBeInTheDocument();
        expect(screen.getByText('File Operations')).toBeInTheDocument();
      });

      // Step 2: Load existing session
      mockChatStore.currentSession = mockSessions[0];
      mockChatStore.messages = mockSessions[0].messages;
      mockUseChatStore.mockReturnValue({
        ...mockChatStore,
        currentSession: mockSessions[0],
        messages: mockSessions[0].messages
      });

      const weatherChatItem = screen.getByText('Weather Chat');
      await user.click(weatherChatItem);

      // Verify session loaded
      await waitFor(() => {
        expect(screen.getByText('What is the weather?')).toBeInTheDocument();
        expect(screen.getByText('The weather is sunny.')).toBeInTheDocument();
      });

      // Step 3: Rename session
      mockApiClient.updateSession.mockResolvedValue({ success: true });
      mockSessionsHook.renameSession.mockResolvedValue(undefined);

      const renameButton = screen.getByRole('button', { name: /rename/i });
      await user.click(renameButton);

      const renameInput = screen.getByDisplayValue('Weather Chat');
      await user.clear(renameInput);
      await user.type(renameInput, 'New York Weather Discussion');

      const saveRenameButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveRenameButton);

      // Verify rename
      await waitFor(() => {
        expect(mockSessionsHook.renameSession).toHaveBeenCalledWith('session-1', 'New York Weather Discussion');
      });

      // Step 4: Archive session
      mockApiClient.updateSession.mockResolvedValue({ success: true });
      mockSessionsHook.archiveSession.mockResolvedValue(undefined);

      const archiveButton = screen.getByRole('button', { name: /archive/i });
      await user.click(archiveButton);

      // Confirm archive
      const confirmArchiveButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmArchiveButton);

      // Verify archive
      await waitFor(() => {
        expect(mockSessionsHook.archiveSession).toHaveBeenCalledWith('session-1');
      });

      // Step 5: Search sessions
      const searchInput = screen.getByPlaceholderText(/search sessions/i);
      await user.type(searchInput, 'file');

      // Should filter to show only File Operations session
      await waitFor(() => {
        expect(screen.getByText('File Operations')).toBeInTheDocument();
        expect(screen.queryByText('Weather Chat')).not.toBeInTheDocument();
      });

      // Step 6: Delete session
      mockApiClient.deleteSession.mockResolvedValue({ success: true });
      mockSessionsHook.deleteSession.mockResolvedValue(undefined);

      const fileSessionItem = screen.getByText('File Operations');
      await user.click(fileSessionItem);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmDeleteButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(confirmDeleteButton);

      // Verify deletion
      await waitFor(() => {
        expect(mockSessionsHook.deleteSession).toHaveBeenCalledWith('session-2');
      });

      // Verify complete session management workflow
      expect(mockSessionsHook.renameSession).toHaveBeenCalledTimes(1);
      expect(mockSessionsHook.archiveSession).toHaveBeenCalledTimes(1);
      expect(mockSessionsHook.deleteSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('Settings Configuration Workflow', () => {
    it('should handle complete settings configuration', async () => {
      const user = userEvent.setup();
      
      // Mock initial settings
      mockApiClient.getSettings.mockResolvedValue({
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

      mockApiClient.updateSettings.mockResolvedValue({ success: true });
      mockApiClient.testConnection.mockResolvedValue({ success: true, models: [] });
      mockApiClient.testMCPServer.mockResolvedValue({ success: true, tools: [] });

      render(
        <ClientProviders>
          <SettingsPage />
        </ClientProviders>
      );

      // Step 1: Configure multiple LLM providers
      const addProviderButton = screen.getByRole('button', { name: /add provider/i });
      
      // Add OpenAI
      await user.click(addProviderButton);
      let providerSelect = screen.getByLabelText(/provider type/i);
      await user.selectOptions(providerSelect, 'openai');
      let apiKeyInput = screen.getByLabelText(/api key/i);
      await user.type(apiKeyInput, 'sk-openai-key');
      let saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Add DeepSeek
      await user.click(addProviderButton);
      providerSelect = screen.getByLabelText(/provider type/i);
      await user.selectOptions(providerSelect, 'deepseek');
      apiKeyInput = screen.getByLabelText(/api key/i);
      await user.type(apiKeyInput, 'sk-deepseek-key');
      saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Step 2: Configure MCP servers
      const mcpTab = screen.getByRole('tab', { name: /mcp servers/i });
      await user.click(mcpTab);

      const addServerButton = screen.getByRole('button', { name: /add server/i });
      
      // Add weather server
      await user.click(addServerButton);
      let serverNameInput = screen.getByLabelText(/server name/i);
      await user.type(serverNameInput, 'weather');
      let commandInput = screen.getByLabelText(/command/i);
      await user.type(commandInput, 'uvx');
      let argsInput = screen.getByLabelText(/arguments/i);
      await user.type(argsInput, 'weather-mcp');
      saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Add file server
      await user.click(addServerButton);
      serverNameInput = screen.getByLabelText(/server name/i);
      await user.type(serverNameInput, 'file');
      commandInput = screen.getByLabelText(/command/i);
      await user.type(commandInput, 'node');
      argsInput = screen.getByLabelText(/arguments/i);
      await user.type(argsInput, 'file-server.js');
      saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Step 3: Update preferences
      const preferencesTab = screen.getByRole('tab', { name: /preferences/i });
      await user.click(preferencesTab);

      const themeSelect = screen.getByLabelText(/theme/i);
      await user.selectOptions(themeSelect, 'dark');

      const languageSelect = screen.getByLabelText(/language/i);
      await user.selectOptions(languageSelect, 'zh');

      const autoScrollToggle = screen.getByLabelText(/auto scroll/i);
      await user.click(autoScrollToggle);

      saveButton = screen.getByRole('button', { name: /save preferences/i });
      await user.click(saveButton);

      // Step 4: Export settings
      const exportButton = screen.getByRole('button', { name: /export settings/i });
      mockApiClient.exportSettings.mockResolvedValue({
        data: JSON.stringify({ test: 'data' }),
        filename: 'settings.json',
        contentType: 'application/json'
      });

      await user.click(exportButton);

      // Verify all configuration steps
      expect(mockApiClient.updateSettings).toHaveBeenCalledTimes(5); // 2 providers + 2 servers + preferences
      expect(mockApiClient.exportSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle and recover from various error scenarios', async () => {
      const user = userEvent.setup();
      
      // Mock network failure scenario
      mockApiClient.sendMessage
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Server timeout'))
        .mockResolvedValueOnce({
          reply: 'Success after retries',
          sessionId: 'session-1'
        });

      renderFullApp();

      const messageInput = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Step 1: Initial failure
      await user.type(messageInput, 'Test message');
      await user.click(sendButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Step 2: Retry with another failure
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/server timeout/i)).toBeInTheDocument();
      });

      // Step 3: Final successful retry
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Success after retries')).toBeInTheDocument();
      });

      // Verify error recovery workflow
      expect(mockApiClient.sendMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('Data Export and Privacy Workflow', () => {
    it('should handle complete data export and privacy cleanup', async () => {
      const user = userEvent.setup();
      
      // Mock data for export
      const mockSessions = [
        {
          id: 'session-1',
          title: 'Test Chat',
          messages: [
            { id: 'msg-1', role: 'user' as const, content: 'Hello', timestamp: new Date() },
            { id: 'msg-2', role: 'assistant' as const, content: 'Hi there!', timestamp: new Date() }
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          provider: 'openai',
          model: 'gpt-4',
          mcpServers: [],
          tags: [],
          archived: false,
          totalTokens: 20,
          estimatedCost: 0.0004
        }
      ];

      mockApiClient.exportChatHistory.mockResolvedValue({
        data: JSON.stringify(mockSessions),
        filename: 'chat-history.json',
        contentType: 'application/json'
      });

      mockApiClient.cleanupPrivacyData.mockResolvedValue({
        deletedCount: 1,
        success: true
      });

      render(
        <ClientProviders>
          <SettingsPage />
        </ClientProviders>
      );

      // Navigate to privacy tab
      const privacyTab = screen.getByRole('tab', { name: /privacy/i });
      await user.click(privacyTab);

      // Step 1: Export chat history
      const exportChatButton = screen.getByRole('button', { name: /export chat history/i });
      await user.click(exportChatButton);

      await waitFor(() => {
        expect(mockApiClient.exportChatHistory).toHaveBeenCalled();
      });

      // Step 2: Export settings
      const exportSettingsButton = screen.getByRole('button', { name: /export settings/i });
      await user.click(exportSettingsButton);

      await waitFor(() => {
        expect(mockApiClient.exportSettings).toHaveBeenCalled();
      });

      // Step 3: Privacy cleanup
      const cleanupButton = screen.getByRole('button', { name: /cleanup data/i });
      await user.click(cleanupButton);

      // Confirm cleanup
      const confirmCleanupButton = screen.getByRole('button', { name: /confirm cleanup/i });
      await user.click(confirmCleanupButton);

      await waitFor(() => {
        expect(mockApiClient.cleanupPrivacyData).toHaveBeenCalled();
        expect(screen.getByText(/1 item deleted/i)).toBeInTheDocument();
      });

      // Verify complete privacy workflow
      expect(mockApiClient.exportChatHistory).toHaveBeenCalledTimes(1);
      expect(mockApiClient.exportSettings).toHaveBeenCalledTimes(1);
      expect(mockApiClient.cleanupPrivacyData).toHaveBeenCalledTimes(1);
    });
  });
});