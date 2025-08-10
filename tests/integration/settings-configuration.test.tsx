/**
 * Integration tests for settings configuration and provider management
 * Tests the complete settings workflow including provider configuration and MCP server management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from '@/src/components/SettingsPage';
import { ClientProviders } from '@/app/components/ClientProviders';
import * as apiClient from '@/src/services/apiClient';

// Mock API client
vi.mock('@/src/services/apiClient');

const mockApiClient = vi.mocked(apiClient);

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Settings Configuration Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const renderSettingsPage = () => {
    return render(
      <ClientProviders>
        <SettingsPage />
      </ClientProviders>
    );
  };

  describe('LLM Provider Configuration', () => {
    it('should load and display existing providers', async () => {
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
        },
        {
          id: 'deepseek-1',
          name: 'deepseek',
          displayName: 'DeepSeek',
          apiKey: 'sk-****5678',
          baseUrl: 'https://api.deepseek.com/v1',
          models: [
            {
              id: 'deepseek-chat',
              name: 'deepseek-chat',
              displayName: 'DeepSeek Chat',
              supportsToolCalling: true,
              maxTokens: 4096,
              costPer1kTokens: { input: 0.001, output: 0.002 }
            }
          ],
          enabled: true,
          rateLimits: { requestsPerMinute: 100, tokensPerMinute: 120000 }
        }
      ];

      mockApiClient.getSettings.mockResolvedValueOnce({
        llmProviders: mockProviders,
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

      renderSettingsPage();

      // Wait for providers to load
      await waitFor(() => {
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
        expect(screen.getByText('DeepSeek')).toBeInTheDocument();
      });

      // Verify masked API keys are shown
      expect(screen.getByText('sk-****1234')).toBeInTheDocument();
      expect(screen.getByText('sk-****5678')).toBeInTheDocument();

      // Verify models are displayed
      expect(screen.getByText('GPT-4')).toBeInTheDocument();
      expect(screen.getByText('DeepSeek Chat')).toBeInTheDocument();
    });

    it('should add new LLM provider', async () => {
      const user = userEvent.setup();
      
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

      mockApiClient.updateSettings.mockResolvedValueOnce({ success: true });

      renderSettingsPage();

      // Click add provider button
      const addProviderButton = screen.getByRole('button', { name: /add provider/i });
      await user.click(addProviderButton);

      // Fill in provider details
      const nameSelect = screen.getByLabelText(/provider type/i);
      await user.selectOptions(nameSelect, 'openai');

      const apiKeyInput = screen.getByLabelText(/api key/i);
      await user.type(apiKeyInput, 'sk-test1234567890abcdef');

      const baseUrlInput = screen.getByLabelText(/base url/i);
      await user.clear(baseUrlInput);
      await user.type(baseUrlInput, 'https://api.openai.com/v1');

      // Save provider
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify API call
      await waitFor(() => {
        expect(mockApiClient.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            llmProviders: expect.arrayContaining([
              expect.objectContaining({
                name: 'openai',
                apiKey: 'sk-test1234567890abcdef',
                baseUrl: 'https://api.openai.com/v1'
              })
            ])
          })
        );
      });
    });

    it('should test provider connection', async () => {
      const user = userEvent.setup();
      
      const mockProvider = {
        id: 'openai-1',
        name: 'openai',
        displayName: 'OpenAI',
        apiKey: 'sk-****1234',
        baseUrl: 'https://api.openai.com/v1',
        models: [],
        enabled: true,
        rateLimits: { requestsPerMinute: 60, tokensPerMinute: 90000 }
      };

      mockApiClient.getSettings.mockResolvedValueOnce({
        llmProviders: [mockProvider],
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

      renderSettingsPage();

      // Wait for provider to load
      await waitFor(() => {
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
      });

      // Click test connection button
      const testButton = screen.getByRole('button', { name: /test connection/i });
      await user.click(testButton);

      // Verify test connection API call
      await waitFor(() => {
        expect(mockApiClient.testConnection).toHaveBeenCalledWith({
          provider: 'openai',
          apiKey: expect.any(String),
          baseUrl: 'https://api.openai.com/v1'
        });
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/connection successful/i)).toBeInTheDocument();
      });
    });

    it('should handle provider connection failure', async () => {
      const user = userEvent.setup();
      
      const mockProvider = {
        id: 'openai-1',
        name: 'openai',
        displayName: 'OpenAI',
        apiKey: 'sk-****1234',
        baseUrl: 'https://api.openai.com/v1',
        models: [],
        enabled: true,
        rateLimits: { requestsPerMinute: 60, tokensPerMinute: 90000 }
      };

      mockApiClient.getSettings.mockResolvedValueOnce({
        llmProviders: [mockProvider],
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

      mockApiClient.testConnection.mockRejectedValueOnce(new Error('Invalid API key'));

      renderSettingsPage();

      // Wait for provider to load
      await waitFor(() => {
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
      });

      // Click test connection button
      const testButton = screen.getByRole('button', { name: /test connection/i });
      await user.click(testButton);

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/invalid api key/i)).toBeInTheDocument();
      });
    });
  });

  describe('MCP Server Configuration', () => {
    it('should load and display MCP servers', async () => {
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
          lastConnected: new Date(),
          tools: [
            {
              name: 'get_weather',
              description: 'Get current weather for a location',
              inputSchema: {
                type: 'object',
                properties: {
                  location: { type: 'string' }
                },
                required: ['location']
              },
              serverId: 'weather',
              requiresConfirmation: true
            }
          ]
        },
        {
          id: 'file',
          name: 'file',
          displayName: 'File System',
          command: 'node',
          args: ['file-server.js'],
          env: { HOME: '/home/user' },
          enabled: false,
          status: 'disconnected' as const,
          tools: []
        }
      ];

      mockApiClient.getSettings.mockResolvedValueOnce({
        llmProviders: [],
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

      renderSettingsPage();

      // Switch to MCP servers tab
      const mcpTab = screen.getByRole('tab', { name: /mcp servers/i });
      await userEvent.setup().click(mcpTab);

      // Wait for servers to load
      await waitFor(() => {
        expect(screen.getByText('Weather Server')).toBeInTheDocument();
        expect(screen.getByText('File System')).toBeInTheDocument();
      });

      // Verify server status
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();

      // Verify tools are displayed
      expect(screen.getByText('get_weather')).toBeInTheDocument();
    });

    it('should add new MCP server', async () => {
      const user = userEvent.setup();
      
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

      mockApiClient.updateSettings.mockResolvedValueOnce({ success: true });

      renderSettingsPage();

      // Switch to MCP servers tab
      const mcpTab = screen.getByRole('tab', { name: /mcp servers/i });
      await user.click(mcpTab);

      // Click add server button
      const addServerButton = screen.getByRole('button', { name: /add server/i });
      await user.click(addServerButton);

      // Fill in server details
      const nameInput = screen.getByLabelText(/server name/i);
      await user.type(nameInput, 'test-server');

      const commandInput = screen.getByLabelText(/command/i);
      await user.type(commandInput, 'node');

      const argsInput = screen.getByLabelText(/arguments/i);
      await user.type(argsInput, 'test-server.js');

      // Save server
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify API call
      await waitFor(() => {
        expect(mockApiClient.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            mcpServers: expect.arrayContaining([
              expect.objectContaining({
                name: 'test-server',
                command: 'node',
                args: ['test-server.js']
              })
            ])
          })
        );
      });
    });

    it('should test MCP server connection', async () => {
      const user = userEvent.setup();
      
      const mockServer = {
        id: 'weather',
        name: 'weather',
        displayName: 'Weather Server',
        command: 'uvx',
        args: ['weather-mcp'],
        env: {},
        enabled: true,
        status: 'disconnected' as const,
        tools: []
      };

      mockApiClient.getSettings.mockResolvedValueOnce({
        llmProviders: [],
        mcpServers: [mockServer],
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

      mockApiClient.testMCPServer.mockResolvedValueOnce({
        success: true,
        tools: [
          {
            name: 'get_weather',
            description: 'Get current weather',
            inputSchema: { type: 'object' },
            serverId: 'weather',
            requiresConfirmation: true
          }
        ]
      });

      renderSettingsPage();

      // Switch to MCP servers tab
      const mcpTab = screen.getByRole('tab', { name: /mcp servers/i });
      await user.click(mcpTab);

      // Wait for server to load
      await waitFor(() => {
        expect(screen.getByText('Weather Server')).toBeInTheDocument();
      });

      // Click test connection button
      const testButton = screen.getByRole('button', { name: /test connection/i });
      await user.click(testButton);

      // Verify test connection API call
      await waitFor(() => {
        expect(mockApiClient.testMCPServer).toHaveBeenCalledWith('weather');
      });

      // Verify success message and tools
      await waitFor(() => {
        expect(screen.getByText(/connection successful/i)).toBeInTheDocument();
        expect(screen.getByText('get_weather')).toBeInTheDocument();
      });
    });
  });

  describe('User Preferences', () => {
    it('should update theme preference', async () => {
      const user = userEvent.setup();
      
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

      mockApiClient.updateSettings.mockResolvedValueOnce({ success: true });

      renderSettingsPage();

      // Switch to preferences tab
      const preferencesTab = screen.getByRole('tab', { name: /preferences/i });
      await user.click(preferencesTab);

      // Change theme to dark
      const themeSelect = screen.getByLabelText(/theme/i);
      await user.selectOptions(themeSelect, 'dark');

      // Save preferences
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify API call
      await waitFor(() => {
        expect(mockApiClient.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            preferences: expect.objectContaining({
              theme: 'dark'
            })
          })
        );
      });
    });

    it('should update language preference', async () => {
      const user = userEvent.setup();
      
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

      mockApiClient.updateSettings.mockResolvedValueOnce({ success: true });

      renderSettingsPage();

      // Switch to preferences tab
      const preferencesTab = screen.getByRole('tab', { name: /preferences/i });
      await user.click(preferencesTab);

      // Change language to Chinese
      const languageSelect = screen.getByLabelText(/language/i);
      await user.selectOptions(languageSelect, 'zh');

      // Save preferences
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify API call
      await waitFor(() => {
        expect(mockApiClient.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            preferences: expect.objectContaining({
              language: 'zh'
            })
          })
        );
      });
    });
  });

  describe('Settings Import/Export', () => {
    it('should export settings', async () => {
      const user = userEvent.setup();
      
      const mockSettings = {
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
      };

      mockApiClient.getSettings.mockResolvedValueOnce(mockSettings);
      mockApiClient.exportSettings.mockResolvedValueOnce({
        data: JSON.stringify(mockSettings),
        filename: 'mcp-chat-settings.json',
        contentType: 'application/json'
      });

      renderSettingsPage();

      // Click export button
      const exportButton = screen.getByRole('button', { name: /export settings/i });
      await user.click(exportButton);

      // Verify export API call
      await waitFor(() => {
        expect(mockApiClient.exportSettings).toHaveBeenCalled();
      });
    });

    it('should import settings', async () => {
      const user = userEvent.setup();
      
      const mockSettings = {
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
      };

      mockApiClient.getSettings.mockResolvedValueOnce(mockSettings);
      mockApiClient.importSettings.mockResolvedValueOnce({ success: true });

      renderSettingsPage();

      // Create mock file
      const file = new File([JSON.stringify(mockSettings)], 'settings.json', {
        type: 'application/json'
      });

      // Find file input and upload file
      const fileInput = screen.getByLabelText(/import settings/i);
      await user.upload(fileInput, file);

      // Verify import API call
      await waitFor(() => {
        expect(mockApiClient.importSettings).toHaveBeenCalledWith(JSON.stringify(mockSettings));
      });
    });
  });
});