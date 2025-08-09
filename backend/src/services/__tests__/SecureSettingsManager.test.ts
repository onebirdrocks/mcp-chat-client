import { promises as fs } from 'fs';
import path from 'path';
import { SecureSettingsManager } from '../SecureSettingsManager';
import { getEncryptionService } from '@/lib/encryption';
import { Settings, LLMProviderConfig } from '@/types';
import { vi } from 'vitest';

// Mock the encryption service
vi.mock('@/lib/encryption');

// Mock fs operations
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

const mockFs = fs as any;
const mockEncryptionService = {
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  hash: vi.fn(),
  maskApiKey: vi.fn(),
};

(getEncryptionService as any).mockReturnValue(mockEncryptionService);

describe('SecureSettingsManager', () => {
  let settingsManager: SecureSettingsManager;
  const testSettingsDir = './test-data/settings';

  beforeEach(() => {
    vi.clearAllMocks();
    settingsManager = new SecureSettingsManager(testSettingsDir);
    
    // Setup default mock implementations
    mockEncryptionService.encrypt.mockImplementation((data: string) => `encrypted_${data}`);
    mockEncryptionService.decrypt.mockImplementation((data: string) => data.replace('encrypted_', ''));
    mockEncryptionService.hash.mockImplementation((data: string) => `hash_${data}`);
    mockEncryptionService.maskApiKey.mockImplementation((key: string) => `••••${key.slice(-4)}`);
  });

  describe('initialize', () => {
    it('should create settings directory and load default settings when file does not exist', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      mockFs.writeFile.mockResolvedValue(undefined);

      await settingsManager.initialize();

      expect(mockFs.mkdir).toHaveBeenCalledWith(testSettingsDir, { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should load existing settings when file exists', async () => {
      const existingSettings = {
        llmProviders: [{
          id: 'test-provider',
          name: 'openai',
          apiKey: 'encrypted_test-key',
          baseUrl: 'https://api.openai.com/v1',
          models: [],
        }],
        mcpServers: [],
        preferences: {
          theme: 'dark',
          language: 'en',
          autoScroll: true,
          soundEnabled: false,
        },
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingSettings));

      await settingsManager.initialize();

      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join(testSettingsDir, 'settings.json'),
        'utf-8'
      );
    });

    it('should throw error when directory creation fails', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(settingsManager.initialize()).rejects.toThrow('Failed to initialize settings storage');
    });
  });

  describe('getSettings', () => {
    beforeEach(async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      mockFs.writeFile.mockResolvedValue(undefined);
      await settingsManager.initialize();
    });

    it('should return settings with masked API keys', async () => {
      const settings = await settingsManager.getSettings();

      expect(settings).toBeDefined();
      expect(settings.llmProviders).toBeDefined();
      expect(mockEncryptionService.maskApiKey).toHaveBeenCalled();
    });

    it('should handle empty API keys gracefully', async () => {
      mockEncryptionService.decrypt.mockReturnValue('');
      mockEncryptionService.maskApiKey.mockReturnValue('••••');

      const settings = await settingsManager.getSettings();

      expect(settings.llmProviders[0].apiKey).toBe('••••');
    });
  });

  describe('updateSettings', () => {
    beforeEach(async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      mockFs.writeFile.mockResolvedValue(undefined);
      await settingsManager.initialize();
    });

    it('should encrypt new API keys', async () => {
      const newSettings: Partial<Settings> = {
        llmProviders: [{
          id: 'test-provider',
          name: 'openai',
          apiKey: 'sk-test123456789',
          baseUrl: 'https://api.openai.com/v1',
          models: [{
            id: 'gpt-4',
            name: 'GPT-4',
            supportsToolCalling: true,
            maxTokens: 8192,
          }],
        }],
      };

      await settingsManager.updateSettings(newSettings);

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('sk-test123456789');
      expect(mockEncryptionService.hash).toHaveBeenCalledWith('sk-test123456789');
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should preserve existing encrypted keys when API key is masked', async () => {
      // First, set up an existing provider with encrypted key
      const existingSettings = {
        llmProviders: [{
          id: 'test-provider',
          name: 'openai',
          apiKey: 'encrypted_existing-key',
          apiKeyHash: 'hash_existing-key',
          baseUrl: 'https://api.openai.com/v1',
          models: [],
        }],
        mcpServers: [],
        preferences: { theme: 'dark', language: 'en', autoScroll: true, soundEnabled: false },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(existingSettings));
      await settingsManager.initialize();

      // Now update with masked key (simulating frontend update)
      const updateSettings: Partial<Settings> = {
        llmProviders: [{
          id: 'test-provider',
          name: 'openai',
          apiKey: '••••key', // Masked key from frontend
          baseUrl: 'https://api.openai.com/v1',
          models: [],
        }],
      };

      await settingsManager.updateSettings(updateSettings);

      // Should not encrypt the masked key, should preserve existing
      expect(mockEncryptionService.encrypt).not.toHaveBeenCalledWith('••••key');
    });

    it('should update preferences correctly', async () => {
      const newPreferences = {
        theme: 'light' as const,
        language: 'zh' as const,
        autoScroll: false,
        soundEnabled: true,
      };

      await settingsManager.updateSettings({ preferences: newPreferences });

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle update errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'));

      const newSettings: Partial<Settings> = {
        preferences: { theme: 'light', language: 'en', autoScroll: true, soundEnabled: false },
      };

      await expect(settingsManager.updateSettings(newSettings)).rejects.toThrow('Failed to update settings');
    });
  });

  describe('getDecryptedApiKey', () => {
    beforeEach(async () => {
      const existingSettings = {
        llmProviders: [{
          id: 'test-provider',
          name: 'openai',
          apiKey: 'encrypted_test-key',
          baseUrl: 'https://api.openai.com/v1',
          models: [],
        }],
        mcpServers: [],
        preferences: { theme: 'dark', language: 'en', autoScroll: true, soundEnabled: false },
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingSettings));
      mockFs.writeFile.mockResolvedValue(undefined);
      await settingsManager.initialize();
    });

    it('should decrypt API key for valid provider', async () => {
      const decryptedKey = await settingsManager.getDecryptedApiKey('test-provider');

      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith('encrypted_test-key');
      expect(decryptedKey).toBe('test-key');
    });

    it('should throw error for non-existent provider', async () => {
      await expect(settingsManager.getDecryptedApiKey('non-existent')).rejects.toThrow(
        'API key not found for provider: non-existent'
      );
    });

    it('should throw error when decryption fails', async () => {
      mockEncryptionService.decrypt.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      await expect(settingsManager.getDecryptedApiKey('test-provider')).rejects.toThrow(
        'Failed to decrypt API key'
      );
    });
  });

  describe('validateApiKey', () => {
    it('should validate OpenAI API key format', async () => {
      const result = await settingsManager.validateApiKey('openai', 'sk-test123456789012345');
      expect(result).toBe(true);
    });

    it('should reject invalid OpenAI API key format', async () => {
      const result = await settingsManager.validateApiKey('openai', 'invalid-key');
      expect(result).toBe(false);
    });

    it('should validate DeepSeek API key format', async () => {
      const result = await settingsManager.validateApiKey('deepseek', 'sk-test123456789012345');
      expect(result).toBe(true);
    });

    it('should validate OpenRouter API key format', async () => {
      const result = await settingsManager.validateApiKey('openrouter', 'sk-or-test123456789012345678901234');
      expect(result).toBe(true);
    });

    it('should reject short API keys', async () => {
      const result = await settingsManager.validateApiKey('openai', 'sk-short');
      expect(result).toBe(false);
    });

    it('should handle unknown providers with basic validation', async () => {
      const result = await settingsManager.validateApiKey('unknown', 'valid-long-key-12345');
      expect(result).toBe(true);
    });
  });

  describe('exportSettings', () => {
    beforeEach(async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      mockFs.writeFile.mockResolvedValue(undefined);
      await settingsManager.initialize();
    });

    it('should export settings without sensitive data', async () => {
      const exportData = await settingsManager.exportSettings();

      expect(exportData.version).toBe('1.0.0');
      expect(exportData.exportDate).toBeDefined();
      expect(exportData.settings.preferences).toBeDefined();
      expect(exportData.settings.mcpServers).toBeDefined();
      // API keys should not be in export
      expect(exportData.settings).not.toHaveProperty('llmProviders');
    });

    it('should sanitize environment variables in MCP servers', async () => {
      const settingsWithEnv: Partial<Settings> = {
        mcpServers: [{
          id: 'test-server',
          name: 'test',
          command: 'test',
          args: [],
          env: {
            'API_KEY': 'secret-key',
            'PUBLIC_VAR': 'public-value',
            'SECRET_TOKEN': 'secret-token',
          },
          enabled: true,
          status: 'disconnected',
        }],
      };

      await settingsManager.updateSettings(settingsWithEnv);
      const exportData = await settingsManager.exportSettings();

      const exportedServer = exportData.settings.mcpServers[0];
      expect(exportedServer.env?.['API_KEY']).toBe('[REDACTED]');
      expect(exportedServer.env?.['PUBLIC_VAR']).toBe('public-value');
      expect(exportedServer.env?.['SECRET_TOKEN']).toBe('[REDACTED]');
    });
  });

  describe('clearSensitiveData', () => {
    beforeEach(async () => {
      const existingSettings = {
        llmProviders: [{
          id: 'test-provider',
          name: 'openai',
          apiKey: 'encrypted_test-key',
          apiKeyHash: 'hash_test-key',
          baseUrl: 'https://api.openai.com/v1',
          models: [],
        }],
        mcpServers: [],
        preferences: { theme: 'dark', language: 'en', autoScroll: true, soundEnabled: false },
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingSettings));
      mockFs.writeFile.mockResolvedValue(undefined);
      await settingsManager.initialize();
    });

    it('should clear all API keys and hashes', async () => {
      await settingsManager.clearSensitiveData();

      expect(mockFs.writeFile).toHaveBeenCalled();
      // Verify the written data has empty API keys
      const writeCall = mockFs.writeFile.mock.calls[mockFs.writeFile.mock.calls.length - 1];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData.llmProviders[0].apiKey).toBe('');
      expect(writtenData.llmProviders[0].apiKeyHash).toBe('');
    });
  });

  describe('getStatistics', () => {
    beforeEach(async () => {
      const existingSettings = {
        llmProviders: [
          {
            id: 'provider-1',
            name: 'openai',
            apiKey: 'encrypted_key1',
            baseUrl: 'https://api.openai.com/v1',
            models: [],
          },
          {
            id: 'provider-2',
            name: 'deepseek',
            apiKey: '', // No key
            baseUrl: 'https://api.deepseek.com/v1',
            models: [],
          },
        ],
        mcpServers: [
          {
            id: 'server-1',
            name: 'test1',
            command: 'test',
            args: [],
            enabled: true,
            status: 'connected',
          },
          {
            id: 'server-2',
            name: 'test2',
            command: 'test',
            args: [],
            enabled: false,
            status: 'disconnected',
          },
        ],
        preferences: { theme: 'dark', language: 'en', autoScroll: true, soundEnabled: false },
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingSettings));
      mockFs.writeFile.mockResolvedValue(undefined);
      await settingsManager.initialize();
    });

    it('should return correct statistics', () => {
      const stats = settingsManager.getStatistics();

      expect(stats.totalProviders).toBe(2);
      expect(stats.providersWithKeys).toBe(1);
      expect(stats.totalMcpServers).toBe(2);
      expect(stats.enabledMcpServers).toBe(1);
      expect(stats.lastUpdated).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('invalid json');

      await expect(settingsManager.initialize()).rejects.toThrow('Failed to initialize settings storage');
    });

    it('should handle file write errors during save', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(settingsManager.initialize()).rejects.toThrow('Failed to initialize settings storage');
    });
  });
});