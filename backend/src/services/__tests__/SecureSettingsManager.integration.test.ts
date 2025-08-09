import { promises as fs } from 'fs';
import path from 'path';
import { SecureSettingsManager } from '../SecureSettingsManager';
import { Settings } from '@/types';

describe('SecureSettingsManager Integration Tests', () => {
  let settingsManager: SecureSettingsManager;
  const testSettingsDir = './test-data/integration-settings';

  beforeEach(async () => {
    // Clean up any existing test data
    try {
      await fs.rm(testSettingsDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, ignore error
    }
    
    settingsManager = new SecureSettingsManager(testSettingsDir);
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await fs.rm(testSettingsDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('end-to-end encryption workflow', () => {
    it('should encrypt, store, and decrypt API keys correctly', async () => {
      await settingsManager.initialize();

      // Add a provider with API key
      const newSettings: Partial<Settings> = {
        llmProviders: [{
          id: 'test-openai',
          name: 'openai',
          apiKey: 'sk-test123456789012345',
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

      // Verify the API key is encrypted in storage
      const settingsFile = path.join(testSettingsDir, 'settings.json');
      const rawData = await fs.readFile(settingsFile, 'utf-8');
      const storedData = JSON.parse(rawData);
      
      expect(storedData.llmProviders[0].apiKey).not.toBe('sk-test123456789012345');
      expect(storedData.llmProviders[0].apiKey).toBeDefined();
      expect(storedData.llmProviders[0].apiKeyHash).toBeDefined();

      // Verify we can decrypt the API key
      const decryptedKey = await settingsManager.getDecryptedApiKey('test-openai');
      expect(decryptedKey).toBe('sk-test123456789012345');

      // Verify masked display
      const settings = await settingsManager.getSettings();
      expect(settings.llmProviders[0].apiKey).toMatch(/^••+\d{4}$/);
      expect(settings.llmProviders[0].apiKey).toContain('2345');
    });

    it('should preserve encrypted keys when updating with masked values', async () => {
      await settingsManager.initialize();

      // First, add a provider with API key
      const initialSettings: Partial<Settings> = {
        llmProviders: [{
          id: 'test-provider',
          name: 'openai',
          apiKey: 'sk-original123456789',
          baseUrl: 'https://api.openai.com/v1',
          models: [],
        }],
      };

      await settingsManager.updateSettings(initialSettings);

      // Get the encrypted key from storage
      const settingsFile = path.join(testSettingsDir, 'settings.json');
      const rawData1 = await fs.readFile(settingsFile, 'utf-8');
      const storedData1 = JSON.parse(rawData1);
      const originalEncryptedKey = storedData1.llmProviders[0].apiKey;

      // Now update with masked key (simulating frontend update)
      const maskedSettings: Partial<Settings> = {
        llmProviders: [{
          id: 'test-provider',
          name: 'openai',
          apiKey: '••••6789', // Masked key
          baseUrl: 'https://api.openai.com/v1',
          models: [],
        }],
      };

      await settingsManager.updateSettings(maskedSettings);

      // Verify the encrypted key is preserved
      const rawData2 = await fs.readFile(settingsFile, 'utf-8');
      const storedData2 = JSON.parse(rawData2);
      expect(storedData2.llmProviders[0].apiKey).toBe(originalEncryptedKey);

      // Verify we can still decrypt the original key
      const decryptedKey = await settingsManager.getDecryptedApiKey('test-provider');
      expect(decryptedKey).toBe('sk-original123456789');
    });

    it('should handle settings persistence across manager instances', async () => {
      // Initialize first manager and add settings
      await settingsManager.initialize();

      const settings: Partial<Settings> = {
        llmProviders: [{
          id: 'persistent-provider',
          name: 'deepseek',
          apiKey: 'sk-persistent123456789',
          baseUrl: 'https://api.deepseek.com/v1',
          models: [],
        }],
        preferences: {
          theme: 'dark',
          language: 'zh',
          autoScroll: false,
          soundEnabled: true,
        },
      };

      await settingsManager.updateSettings(settings);

      // Create new manager instance and verify data persists
      const newManager = new SecureSettingsManager(testSettingsDir);
      await newManager.initialize();

      const loadedSettings = await newManager.getSettings();
      expect(loadedSettings.llmProviders).toHaveLength(1);
      expect(loadedSettings.llmProviders[0].id).toBe('persistent-provider');
      expect(loadedSettings.llmProviders[0].name).toBe('deepseek');
      expect(loadedSettings.preferences.theme).toBe('dark');
      expect(loadedSettings.preferences.language).toBe('zh');

      // Verify API key can be decrypted by new instance
      const decryptedKey = await newManager.getDecryptedApiKey('persistent-provider');
      expect(decryptedKey).toBe('sk-persistent123456789');
    });

    it('should handle export and import workflow', async () => {
      await settingsManager.initialize();

      // Add settings with sensitive data
      const settings: Partial<Settings> = {
        llmProviders: [{
          id: 'export-provider',
          name: 'openai',
          apiKey: 'sk-export123456789',
          baseUrl: 'https://api.openai.com/v1',
          models: [],
        }],
        mcpServers: [{
          id: 'test-server',
          name: 'test',
          command: 'test-command',
          args: ['arg1', 'arg2'],
          env: {
            'API_KEY': 'secret-key',
            'PUBLIC_VAR': 'public-value',
          },
          enabled: true,
          status: 'disconnected',
        }],
        preferences: {
          theme: 'light',
          language: 'en',
          autoScroll: true,
          soundEnabled: false,
        },
      };

      await settingsManager.updateSettings(settings);

      // Export settings
      const exportData = await settingsManager.exportSettings();

      expect(exportData.version).toBe('1.0.0');
      expect(exportData.settings.preferences).toEqual(settings.preferences);
      expect(exportData.settings.mcpServers).toHaveLength(1);
      
      // Verify sensitive data is sanitized
      expect(exportData.settings.mcpServers[0].env?.['API_KEY']).toBe('[REDACTED]');
      expect(exportData.settings.mcpServers[0].env?.['PUBLIC_VAR']).toBe('public-value');
      
      // Verify API keys are not included
      expect(exportData.settings).not.toHaveProperty('llmProviders');

      // Test import (create new manager)
      const newManager = new SecureSettingsManager('./test-data/import-settings');
      await newManager.initialize();
      await newManager.importSettings(exportData);

      const importedSettings = await newManager.getSettings();
      expect(importedSettings.preferences).toEqual(settings.preferences);
      expect(importedSettings.mcpServers).toHaveLength(1);
      expect(importedSettings.mcpServers[0].name).toBe('test');

      // Clean up import test directory
      await fs.rm('./test-data/import-settings', { recursive: true, force: true });
    });

    it('should validate API keys correctly', async () => {
      await settingsManager.initialize();

      // Test various API key formats
      expect(await settingsManager.validateApiKey('openai', 'sk-test123456789012345')).toBe(true);
      expect(await settingsManager.validateApiKey('openai', 'invalid-key')).toBe(false);
      expect(await settingsManager.validateApiKey('openai', 'sk-short')).toBe(false);

      expect(await settingsManager.validateApiKey('deepseek', 'sk-deepseek123456789012345')).toBe(true);
      expect(await settingsManager.validateApiKey('deepseek', 'invalid-deepseek')).toBe(false);

      expect(await settingsManager.validateApiKey('openrouter', 'sk-or-openrouter123456789012345')).toBe(true);
      expect(await settingsManager.validateApiKey('openrouter', 'sk-invalid-openrouter')).toBe(false);

      expect(await settingsManager.validateApiKey('unknown', 'valid-long-key-12345')).toBe(true);
      expect(await settingsManager.validateApiKey('unknown', 'short')).toBe(false);
    });

    it('should provide accurate statistics', async () => {
      await settingsManager.initialize();

      // Add multiple providers and servers
      const settings: Partial<Settings> = {
        llmProviders: [
          {
            id: 'provider-1',
            name: 'openai',
            apiKey: 'sk-key1234567890',
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
      };

      await settingsManager.updateSettings(settings);

      const stats = settingsManager.getStatistics();
      expect(stats.totalProviders).toBe(2);
      expect(stats.providersWithKeys).toBe(1);
      expect(stats.totalMcpServers).toBe(2);
      expect(stats.enabledMcpServers).toBe(1);
      expect(stats.lastUpdated).toBeDefined();
    });
  });
});