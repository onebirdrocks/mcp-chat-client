import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecureSettingsManager } from '../secure-settings-manager';
import { SecureStorage } from '../secure-storage';
import { EncryptionService } from '../encryption';
import { LLMProviderConfig, MCPServerConfig } from '../../types';

describe('SecureSettingsManager', () => {
  let settingsManager: SecureSettingsManager;
  let storage: SecureStorage;
  let encryption: EncryptionService;
  const testPassword = 'test-settings-password-123';

  beforeEach(async () => {
    encryption = new EncryptionService();
    await encryption.initialize(testPassword);
    
    // Use unique directory for each test to avoid interference
    const testDir = `test-settings-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    storage = new SecureStorage(encryption, {
      baseDir: testDir,
      encryptionEnabled: true,
    });

    settingsManager = new SecureSettingsManager(storage, encryption, testPassword);
  });

  afterEach(() => {
    settingsManager.cleanup();
    encryption.clearSensitiveData();
  });

  describe('settings initialization', () => {
    it('should load default settings when none exist', async () => {
      const settings = await settingsManager.loadSettings();
      
      expect(settings).toBeDefined();
      expect(settings.version).toBe('1.0.0');
      expect(settings.llmProviders).toEqual([]);
      expect(settings.mcpServers).toEqual([]);
      expect(settings.preferences).toBeDefined();
      expect(settings.security).toBeDefined();
    });

    it('should load existing settings from storage', async () => {
      // First load to create defaults
      await settingsManager.loadSettings();
      
      // Update settings
      await settingsManager.updatePreferences({ theme: 'dark', language: 'zh' });
      
      // Create new manager to test loading
      const newManager = new SecureSettingsManager(storage, encryption, testPassword);
      const loadedSettings = await newManager.loadSettings();
      
      expect(loadedSettings.preferences.theme).toBe('dark');
      expect(loadedSettings.preferences.language).toBe('zh');
      
      newManager.cleanup();
    });

    it('should get current settings', async () => {
      await settingsManager.loadSettings();
      const settings = settingsManager.getSettings();
      
      expect(settings).toBeDefined();
      expect(settings.version).toBe('1.0.0');
    });

    it('should throw error when getting settings before loading', () => {
      expect(() => settingsManager.getSettings()).toThrow('Settings not loaded');
    });
  });

  describe('LLM provider management', () => {
    beforeEach(async () => {
      await settingsManager.loadSettings();
    });

    it('should add new LLM provider', async () => {
      const provider: LLMProviderConfig = {
        id: 'openai-test',
        name: 'openai',
        displayName: 'OpenAI Test',
        apiKey: 'sk-test-key-123',
        models: [],
        enabled: true,
        rateLimits: { requestsPerMinute: 60, tokensPerMinute: 10000 },
      };

      await settingsManager.updateLLMProvider(provider);
      const settings = settingsManager.getSettings();
      
      expect(settings.llmProviders).toHaveLength(1);
      expect(settings.llmProviders[0].id).toBe('openai-test');
      // API key should be decrypted when loaded
      expect(typeof settings.llmProviders[0].apiKey).toBe('string');
      expect(settings.llmProviders[0].apiKey).toBe('sk-test-key-123');
    });

    it('should update existing LLM provider', async () => {
      const provider: LLMProviderConfig = {
        id: 'openai-test',
        name: 'openai',
        displayName: 'OpenAI Test',
        apiKey: 'sk-test-key-123',
        models: [],
        enabled: true,
        rateLimits: { requestsPerMinute: 60, tokensPerMinute: 10000 },
      };

      await settingsManager.updateLLMProvider(provider);
      
      // Update the provider
      const updatedProvider = { ...provider, displayName: 'OpenAI Updated', enabled: false };
      await settingsManager.updateLLMProvider(updatedProvider);
      
      const settings = settingsManager.getSettings();
      expect(settings.llmProviders).toHaveLength(1);
      expect(settings.llmProviders[0].displayName).toBe('OpenAI Updated');
      expect(settings.llmProviders[0].enabled).toBe(false);
    });

    it('should remove LLM provider', async () => {
      const provider: LLMProviderConfig = {
        id: 'openai-test',
        name: 'openai',
        displayName: 'OpenAI Test',
        apiKey: 'sk-test-key-123',
        models: [],
        enabled: true,
        rateLimits: { requestsPerMinute: 60, tokensPerMinute: 10000 },
      };

      await settingsManager.updateLLMProvider(provider);
      expect(settingsManager.getSettings().llmProviders).toHaveLength(1);
      
      await settingsManager.removeLLMProvider('openai-test');
      expect(settingsManager.getSettings().llmProviders).toHaveLength(0);
    });

    it('should mask API keys for display', async () => {
      const provider: LLMProviderConfig = {
        id: 'openai-test',
        name: 'openai',
        displayName: 'OpenAI Test',
        apiKey: 'sk-test-key-123456789',
        models: [],
        enabled: true,
        rateLimits: { requestsPerMinute: 60, tokensPerMinute: 10000 },
      };

      await settingsManager.updateLLMProvider(provider);
      const maskedKey = settingsManager.getMaskedApiKey('openai-test');
      
      expect(maskedKey).toBe('****6789');
    });
  });

  describe('MCP server management', () => {
    beforeEach(async () => {
      await settingsManager.loadSettings();
    });

    it('should add new MCP server', async () => {
      const server: MCPServerConfig = {
        id: 'test-server',
        name: 'test-server',
        displayName: 'Test Server',
        command: 'python',
        args: ['server.py'],
        enabled: true,
        status: 'disconnected',
        tools: [],
      };

      await settingsManager.updateMCPServer(server);
      const settings = settingsManager.getSettings();
      
      expect(settings.mcpServers).toHaveLength(1);
      expect(settings.mcpServers[0].id).toBe('test-server');
    });

    it('should update existing MCP server', async () => {
      const server: MCPServerConfig = {
        id: 'test-server',
        name: 'test-server',
        displayName: 'Test Server',
        command: 'python',
        args: ['server.py'],
        enabled: true,
        status: 'disconnected',
        tools: [],
      };

      await settingsManager.updateMCPServer(server);
      
      const updatedServer = { ...server, displayName: 'Updated Server', enabled: false };
      await settingsManager.updateMCPServer(updatedServer);
      
      const settings = settingsManager.getSettings();
      expect(settings.mcpServers[0].displayName).toBe('Updated Server');
      expect(settings.mcpServers[0].enabled).toBe(false);
    });

    it('should remove MCP server', async () => {
      const server: MCPServerConfig = {
        id: 'test-server',
        name: 'test-server',
        displayName: 'Test Server',
        command: 'python',
        args: ['server.py'],
        enabled: true,
        status: 'disconnected',
        tools: [],
      };

      await settingsManager.updateMCPServer(server);
      expect(settingsManager.getSettings().mcpServers).toHaveLength(1);
      
      await settingsManager.removeMCPServer('test-server');
      expect(settingsManager.getSettings().mcpServers).toHaveLength(0);
    });
  });

  describe('preferences management', () => {
    beforeEach(async () => {
      await settingsManager.loadSettings();
    });

    it('should update user preferences', async () => {
      await settingsManager.updatePreferences({
        theme: 'dark',
        language: 'zh',
        autoScroll: false,
      });

      const settings = settingsManager.getSettings();
      expect(settings.preferences.theme).toBe('dark');
      expect(settings.preferences.language).toBe('zh');
      expect(settings.preferences.autoScroll).toBe(false);
      // Other preferences should remain unchanged
      expect(settings.preferences.soundEnabled).toBe(false); // default value
    });
  });

  describe('security settings management', () => {
    beforeEach(async () => {
      await settingsManager.loadSettings();
    });

    it('should update security settings', async () => {
      await settingsManager.updateSecuritySettings({
        sessionTimeout: 120,
        maxRequestsPerMinute: 200,
        logLevel: 'debug',
      });

      const settings = settingsManager.getSettings();
      expect(settings.security.sessionTimeout).toBe(120);
      expect(settings.security.maxRequestsPerMinute).toBe(200);
      expect(settings.security.logLevel).toBe('debug');
    });
  });

  describe('settings validation', () => {
    it('should validate valid settings', () => {
      const validSettings = {
        version: '1.0.0',
        llmProviders: [{
          id: 'test',
          name: 'openai',
          displayName: 'Test',
          apiKey: 'sk-test',
          models: [],
          enabled: true,
          rateLimits: { requestsPerMinute: 60, tokensPerMinute: 10000 },
        }],
        mcpServers: [{
          id: 'test-server',
          name: 'test',
          displayName: 'Test',
          command: 'python',
          args: ['test.py'],
          enabled: true,
          status: 'disconnected' as const,
          tools: [],
        }],
        preferences: {
          theme: 'light' as const,
          language: 'en' as const,
          autoScroll: true,
          soundEnabled: false,
          confirmToolCalls: true,
          showTokenCount: true,
          autoGenerateTitles: true,
          maxHistoryLength: 1000,
          exportFormat: 'json' as const,
        },
        security: {
          encryptionEnabled: true,
          sessionTimeout: 60,
          maxRequestsPerMinute: 100,
          allowedOrigins: ['http://localhost:3000'],
          logLevel: 'info' as const,
          auditEnabled: true,
        },
        lastUpdated: new Date().toISOString(),
      };

      const result = settingsManager.validateSettings(validSettings);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid settings', () => {
      const invalidSettings = {
        // Missing version
        llmProviders: [{
          // Missing id and name
          displayName: 'Test',
          apiKey: 'sk-test',
          models: [],
          enabled: true,
          rateLimits: { requestsPerMinute: 60, tokensPerMinute: 10000 },
        }],
        mcpServers: 'not-an-array', // Should be array
        preferences: {
          theme: 'invalid-theme',
          language: 'invalid-lang',
          autoScroll: true,
          soundEnabled: false,
          confirmToolCalls: true,
          showTokenCount: true,
          autoGenerateTitles: true,
          maxHistoryLength: 1000,
          exportFormat: 'json' as const,
        },
        security: {
          encryptionEnabled: true,
          sessionTimeout: -1, // Invalid
          maxRequestsPerMinute: 2000, // Too high
          allowedOrigins: ['http://localhost:3000'],
          logLevel: 'info' as const,
          auditEnabled: true,
        },
        lastUpdated: new Date().toISOString(),
      } as any;

      const result = settingsManager.validateSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('backup and restore', () => {
    beforeEach(async () => {
      await settingsManager.loadSettings();
    });

    it('should create settings backup', async () => {
      await settingsManager.updatePreferences({ theme: 'dark' });
      
      const backup = await settingsManager.createBackup();
      
      expect(backup).toBeDefined();
      expect(backup.settings).toBeDefined();
      expect(backup.timestamp).toBeDefined();
      expect(backup.version).toBe('1.0.0');
      expect(backup.checksum).toBeDefined();
      expect(backup.settings.preferences.theme).toBe('dark');
    });

    it('should restore from backup', async () => {
      // Set initial state
      await settingsManager.updatePreferences({ theme: 'dark', language: 'zh' });
      const backup = await settingsManager.createBackup();
      
      // Change settings
      await settingsManager.updatePreferences({ theme: 'light', language: 'en' });
      expect(settingsManager.getSettings().preferences.theme).toBe('light');
      
      // Restore from backup
      await settingsManager.restoreFromBackup(backup);
      expect(settingsManager.getSettings().preferences.theme).toBe('dark');
      expect(settingsManager.getSettings().preferences.language).toBe('zh');
    });

    it('should reject corrupted backup', async () => {
      const corruptedBackup = {
        settings: {} as any,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        checksum: 'invalid-checksum',
      };

      await expect(settingsManager.restoreFromBackup(corruptedBackup))
        .rejects.toThrow('Backup integrity check failed');
    });
  });

  describe('import and export', () => {
    beforeEach(async () => {
      await settingsManager.loadSettings();
    });

    it('should export settings without sensitive data', async () => {
      const provider: LLMProviderConfig = {
        id: 'openai-test',
        name: 'openai',
        displayName: 'OpenAI Test',
        apiKey: 'sk-secret-key-123',
        models: [],
        enabled: true,
        rateLimits: { requestsPerMinute: 60, tokensPerMinute: 10000 },
      };

      await settingsManager.updateLLMProvider(provider);
      
      const exported = await settingsManager.exportSettings(false);
      const exportedData = JSON.parse(exported);
      
      expect(exportedData.llmProviders[0].apiKey).toBe('***REDACTED***');
    });

    it('should export settings with sensitive data when requested', async () => {
      const provider: LLMProviderConfig = {
        id: 'openai-test',
        name: 'openai',
        displayName: 'OpenAI Test',
        apiKey: 'sk-secret-key-123',
        models: [],
        enabled: true,
        rateLimits: { requestsPerMinute: 60, tokensPerMinute: 10000 },
      };

      await settingsManager.updateLLMProvider(provider);
      
      const exported = await settingsManager.exportSettings(true);
      const exportedData = JSON.parse(exported);
      
      expect(exportedData.llmProviders[0].apiKey).toBe('sk-secret-key-123');
    });

    it('should import settings', async () => {
      const settingsToImport = {
        version: '1.0.0',
        llmProviders: [],
        mcpServers: [],
        preferences: {
          theme: 'dark',
          language: 'zh',
          autoScroll: false,
          soundEnabled: true,
          confirmToolCalls: true,
          showTokenCount: true,
          autoGenerateTitles: true,
          maxHistoryLength: 500,
          exportFormat: 'markdown',
        },
        security: {
          encryptionEnabled: true,
          sessionTimeout: 90,
          maxRequestsPerMinute: 150,
          allowedOrigins: ['http://localhost:3000'],
          logLevel: 'debug',
          auditEnabled: false,
        },
        lastUpdated: new Date().toISOString(),
      };

      await settingsManager.importSettings(JSON.stringify(settingsToImport));
      
      const settings = settingsManager.getSettings();
      expect(settings.preferences.theme).toBe('dark');
      expect(settings.preferences.language).toBe('zh');
      expect(settings.preferences.maxHistoryLength).toBe(500);
      expect(settings.security.sessionTimeout).toBe(90);
    });

    it('should reject invalid import data', async () => {
      const invalidSettings = '{"invalid": "data"}';
      
      await expect(settingsManager.importSettings(invalidSettings))
        .rejects.toThrow('Invalid settings');
    });
  });

  describe('API key testing', () => {
    beforeEach(async () => {
      await settingsManager.loadSettings();
    });

    it('should test API key validity', async () => {
      const provider: LLMProviderConfig = {
        id: 'openai-test',
        name: 'openai',
        displayName: 'OpenAI Test',
        apiKey: 'sk-valid-key-123456789',
        models: [],
        enabled: true,
        rateLimits: { requestsPerMinute: 60, tokensPerMinute: 10000 },
      };

      await settingsManager.updateLLMProvider(provider);
      
      const result = await settingsManager.testApiKey('openai-test');
      expect(result.valid).toBe(true);
    });

    it('should detect invalid API key', async () => {
      const provider: LLMProviderConfig = {
        id: 'openai-test',
        name: 'openai',
        displayName: 'OpenAI Test',
        apiKey: 'short', // Too short
        models: [],
        enabled: true,
        rateLimits: { requestsPerMinute: 60, tokensPerMinute: 10000 },
      };

      await settingsManager.updateLLMProvider(provider);
      
      const result = await settingsManager.testApiKey('openai-test');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key too short');
    });

    it('should handle missing provider', async () => {
      const result = await settingsManager.testApiKey('non-existent');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Provider or API key not found');
    });
  });

  describe('reset functionality', () => {
    it('should reset to default settings', async () => {
      await settingsManager.loadSettings();
      
      // Make changes
      await settingsManager.updatePreferences({ theme: 'dark', language: 'zh' });
      expect(settingsManager.getSettings().preferences.theme).toBe('dark');
      
      // Reset
      await settingsManager.resetToDefaults();
      expect(settingsManager.getSettings().preferences.theme).toBe('system'); // default
      expect(settingsManager.getSettings().preferences.language).toBe('en'); // default
    });
  });

  describe('cleanup', () => {
    it('should cleanup sensitive data from memory', async () => {
      await settingsManager.loadSettings();
      
      const provider: LLMProviderConfig = {
        id: 'openai-test',
        name: 'openai',
        displayName: 'OpenAI Test',
        apiKey: 'sk-secret-key-123',
        models: [],
        enabled: true,
        rateLimits: { requestsPerMinute: 60, tokensPerMinute: 10000 },
      };

      await settingsManager.updateLLMProvider(provider);
      
      settingsManager.cleanup();
      
      // Should throw error after cleanup
      expect(() => settingsManager.getSettings()).toThrow('Settings not loaded');
    });
  });
});