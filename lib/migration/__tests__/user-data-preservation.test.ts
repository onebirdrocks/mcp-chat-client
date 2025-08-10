// Tests for user data preservation utilities

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { 
  createUserDataInventory,
  preserveChatSessions,
  preserveUserSettings,
  migrateApiKeyStorage,
  preserveMCPServerConfigurations,
  validateDataPreservation
} from '../user-data-preservation';

// Mock fs operations
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      stat: vi.fn(),
    },
  };
});

const mockFs = fs as any;

// Mock security module
vi.mock('../../security/secure-settings-manager', () => ({
  SecureSettingsManager: vi.fn().mockImplementation(() => ({
    setProviderApiKey: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('User Data Preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUserDataInventory', () => {
    it('should create inventory from existing data', async () => {
      const mockSessionsData = {
        sessions: {
          'session-1': {
            id: 'session-1',
            title: 'Test Session',
            messages: [
              { id: 'msg-1', role: 'user', content: 'Hello' },
              { id: 'msg-2', role: 'assistant', content: 'Hi there' },
            ],
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-02T00:00:00.000Z',
            provider: 'openai',
            model: 'gpt-4',
          },
          'session-2': {
            id: 'session-2',
            title: 'Tool Session',
            messages: [
              {
                id: 'msg-3',
                role: 'assistant',
                content: 'Using tool',
                toolCalls: [{ id: 'tool-1', type: 'function', function: { name: 'test' } }],
              },
            ],
            createdAt: '2025-01-03T00:00:00.000Z',
            updatedAt: '2025-01-03T00:00:00.000Z',
            provider: 'deepseek',
            model: 'deepseek-chat',
          },
        },
      };

      const mockSettingsData = {
        llmProviders: [
          { id: 'p1', name: 'openai', apiKey: 'U2FsdGVkX1encrypted' },
          { id: 'p2', name: 'deepseek', apiKey: 'plain-key' },
        ],
        mcpServers: [
          { id: 's1', name: 'server1' },
        ],
        preferences: {
          theme: 'dark',
          language: 'en',
        },
      };

      mockFs.stat.mockResolvedValue({ size: 1024, mtime: new Date('2025-01-04T00:00:00.000Z') });
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockSessionsData))
        .mockResolvedValueOnce(JSON.stringify(mockSettingsData));

      const { inventory, error } = await createUserDataInventory();

      expect(error).toBeUndefined();
      expect(inventory).toBeDefined();
      expect(inventory!.chatSessions.count).toBe(2);
      expect(inventory!.chatSessions.totalMessages).toBe(3);
      expect(inventory!.chatSessions.hasToolCalls).toBe(true);
      expect(inventory!.chatSessions.providers).toEqual(['openai', 'deepseek']);
      expect(inventory!.chatSessions.models).toEqual(['gpt-4', 'deepseek-chat']);
      expect(inventory!.settings.llmProviders).toBe(2);
      expect(inventory!.settings.mcpServers).toBe(1);
      expect(inventory!.settings.hasEncryptedKeys).toBe(true);
    });

    it('should handle missing data gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const { inventory, error } = await createUserDataInventory();

      expect(error).toBeUndefined();
      expect(inventory).toBeDefined();
      expect(inventory!.chatSessions.count).toBe(0);
      expect(inventory!.settings.llmProviders).toBe(0);
    });
  });

  describe('preserveChatSessions', () => {
    it('should preserve chat sessions with metadata', async () => {
      const mockSessionsData = {
        sessions: {
          'session-1': {
            id: 'session-1',
            title: 'Test Session',
            messages: [{ id: 'msg-1', role: 'user', content: 'Hello' }],
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
            provider: 'openai',
            model: 'gpt-4',
          },
        },
        metadata: { totalSessions: 1 },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockSessionsData));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await preserveChatSessions({
        preserveEncryption: true,
        validateIntegrity: true,
        createChecksums: true,
        preserveTimestamps: true,
        preserveMetadata: true,
      });

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(1);
      expect(mockFs.writeFile).toHaveBeenCalled();

      // Check that preserved data includes metadata
      const writeCall = mockFs.writeFile.mock.calls[0];
      const preservedData = JSON.parse(writeCall[1]);
      expect(preservedData.sessions['session-1'].preservationMetadata).toBeDefined();
      expect(preservedData.metadata.preservationInfo).toBeDefined();
    });

    it('should handle missing sessions gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await preserveChatSessions();

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
      expect(result.warnings.some(w => w.includes('No existing chat sessions'))).toBe(true);
    });
  });

  describe('preserveUserSettings', () => {
    it('should preserve settings with encryption info', async () => {
      const mockSettingsData = {
        llmProviders: [
          {
            id: 'openai-1',
            name: 'openai',
            apiKey: 'U2FsdGVkX1encrypted',
            models: [{ id: 'gpt-4', name: 'GPT-4', supportsToolCalling: true }],
            enabled: true,
          },
        ],
        mcpServers: [
          { id: 'server-1', name: 'Test Server', command: 'node', args: ['server.js'], enabled: true },
        ],
        preferences: {
          theme: 'dark',
          language: 'en',
          autoScroll: true,
          soundEnabled: false,
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockSettingsData));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await preserveUserSettings({
        preserveEncryption: true,
        validateIntegrity: true,
        createChecksums: false,
        preserveTimestamps: true,
        preserveMetadata: true,
      });

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(3); // 1 provider + 1 server + 1 preferences
      expect(result.warnings.some(w => w.includes('encrypted API key'))).toBe(true);

      // Check preserved data structure
      const writeCall = mockFs.writeFile.mock.calls[0];
      const preservedData = JSON.parse(writeCall[1]);
      expect(preservedData.llmProviders).toHaveLength(1);
      expect(preservedData.mcpServers).toHaveLength(1);
      expect(preservedData.preferences).toBeDefined();
      expect(preservedData.metadata.preservationInfo).toBeDefined();
    });
  });

  describe('preserveMCPServerConfigurations', () => {
    it('should preserve MCP config from multiple sources', async () => {
      const mockMcpConfig = {
        mcpServers: {
          'server-1': {
            command: 'node',
            args: ['server1.js'],
            env: { NODE_ENV: 'production' },
          },
          'server-2': {
            command: 'python',
            args: ['server2.py'],
          },
        },
      };

      const mockSettingsData = {
        mcpServers: [
          { id: 'server-3', name: 'Server 3', command: 'uvx', args: ['server3'], enabled: true },
        ],
      };

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockMcpConfig))
        .mockResolvedValueOnce(JSON.stringify(mockSettingsData));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await preserveMCPServerConfigurations();

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(3); // 2 from config + 1 from settings

      // Check preserved config structure
      const writeCall = mockFs.writeFile.mock.calls[0];
      const preservedConfig = JSON.parse(writeCall[1]);
      expect(Object.keys(preservedConfig.mcpServers)).toHaveLength(3);
      expect(preservedConfig.mcpServers['server-1'].command).toBe('node');
      expect(preservedConfig.mcpServers['server-3'].command).toBe('uvx');
    });

    it('should handle missing MCP config gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await preserveMCPServerConfigurations();

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
      expect(result.warnings.some(w => w.includes('No MCP server configurations'))).toBe(true);
    });
  });

  describe('validateDataPreservation', () => {
    it('should validate preserved data exists', async () => {
      const mockSessionsData = {
        sessions: { 'session-1': { id: 'session-1', preservationMetadata: {} } },
      };
      const mockSettingsData = {
        llmProviders: [{ id: 'p1' }],
        preferences: { theme: 'dark' },
      };
      const mockMcpConfig = {
        mcpServers: { 'server-1': { command: 'node' } },
      };

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockSessionsData))
        .mockResolvedValueOnce(JSON.stringify(mockSettingsData))
        .mockResolvedValueOnce(JSON.stringify(mockMcpConfig));

      const result = await validateDataPreservation();

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('Found 1 preserved sessions'))).toBe(true);
      expect(result.warnings.some(w => w.includes('Found preserved settings'))).toBe(true);
      expect(result.warnings.some(w => w.includes('Found 1 preserved MCP servers'))).toBe(true);
    });

    it('should detect missing preservation metadata', async () => {
      const mockSessionsData = {
        sessions: { 'session-1': { id: 'session-1' } }, // Missing preservationMetadata
      };

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockSessionsData))
        .mockRejectedValueOnce(new Error('Settings not found'))
        .mockRejectedValueOnce(new Error('MCP config not found'));

      const result = await validateDataPreservation();

      expect(result.valid).toBe(true); // Still valid, just warnings
      expect(result.warnings.some(w => w.includes('missing preservation metadata'))).toBe(true);
    });

    it('should handle validation errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      const result = await validateDataPreservation();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Error Handling in Data Preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle file system errors gracefully', async () => {
    mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

    const result = await preserveChatSessions();

    expect(result.success).toBe(true); // Should succeed with warning
    expect(result.warnings.some(w => w.includes('No existing chat sessions'))).toBe(true);
  });

  it('should handle invalid JSON data', async () => {
    mockFs.readFile.mockResolvedValue('invalid json');

    const result = await preserveChatSessions();

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle write failures', async () => {
    const mockSessionsData = { sessions: { 'session-1': { id: 'session-1' } } };
    mockFs.readFile.mockResolvedValue(JSON.stringify(mockSessionsData));
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockRejectedValue(new Error('Disk full'));

    const result = await preserveChatSessions();

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('Disk full'))).toBe(true);
  });
});