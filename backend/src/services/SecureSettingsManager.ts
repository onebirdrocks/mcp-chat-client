import { promises as fs } from 'fs';
import path from 'path';
import { Settings, LLMProviderConfig, MCPServerConfig, UserPreferences } from '@/types';
import { getEncryptionService } from '@/lib/encryption';
import { InternalServerError, ValidationError } from '@/lib/errors';

export interface SecureSettings extends Omit<Settings, 'llmProviders'> {
  llmProviders: SecureLLMProviderConfig[];
}

export interface SecureLLMProviderConfig extends Omit<LLMProviderConfig, 'apiKey'> {
  apiKey: string; // This will be encrypted
  apiKeyHash?: string; // For validation without decryption
}

export interface SettingsExport {
  version: string;
  exportDate: string;
  settings: {
    preferences: UserPreferences;
    mcpServers: MCPServerConfig[];
    // API keys are excluded from exports for security
  };
}

export class SecureSettingsManager {
  private readonly settingsDir: string;
  private readonly settingsFile: string;
  private readonly encryptionService = getEncryptionService();
  private settings: SecureSettings;

  constructor(settingsDir: string = './data/settings') {
    this.settingsDir = settingsDir;
    this.settingsFile = path.join(settingsDir, 'settings.json');
    this.settings = this.getDefaultSettings();
  }

  /**
   * Initialize the settings manager and load existing settings
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureSettingsDirectory();
      await this.loadSettings();
    } catch (error) {
      console.error('Failed to initialize SecureSettingsManager:', error);
      throw new InternalServerError('Failed to initialize settings storage');
    }
  }

  /**
   * Get current settings with masked API keys for frontend display
   */
  async getSettings(): Promise<Settings> {
    const settings = { ...this.settings };
    
    // Mask API keys for frontend display
    settings.llmProviders = settings.llmProviders.map(provider => ({
      ...provider,
      apiKey: this.encryptionService.maskApiKey(
        provider.apiKey ? this.encryptionService.decrypt(provider.apiKey) : ''
      ),
    }));

    return settings;
  }

  /**
   * Update settings with secure API key handling
   */
  async updateSettings(newSettings: Partial<Settings>): Promise<Settings> {
    try {
      // Handle LLM provider updates with encryption
      if (newSettings.llmProviders) {
        const updatedProviders: SecureLLMProviderConfig[] = [];
        
        for (const provider of newSettings.llmProviders) {
          const existingProvider = this.settings.llmProviders.find(p => p.id === provider.id);
          
          let encryptedApiKey = '';
          let apiKeyHash = '';
          
          if (provider.apiKey) {
            // Check if API key is already masked (unchanged from frontend)
            if (provider.apiKey.includes('*')) {
              // Keep existing encrypted key
              if (existingProvider) {
                encryptedApiKey = existingProvider.apiKey;
                apiKeyHash = existingProvider.apiKeyHash || '';
              }
            } else {
              // New or updated API key - encrypt it
              encryptedApiKey = this.encryptionService.encrypt(provider.apiKey);
              apiKeyHash = this.encryptionService.hash(provider.apiKey);
            }
          }

          updatedProviders.push({
            ...provider,
            apiKey: encryptedApiKey,
            apiKeyHash,
          });
        }
        
        this.settings.llmProviders = updatedProviders;
      }

      // Update other settings
      if (newSettings.mcpServers) {
        this.settings.mcpServers = newSettings.mcpServers;
      }

      if (newSettings.preferences) {
        this.settings.preferences = { ...this.settings.preferences, ...newSettings.preferences };
      }

      await this.saveSettings();
      return this.getSettings();
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw new InternalServerError('Failed to update settings');
    }
  }

  /**
   * Get decrypted API key for a specific provider (for backend use only)
   */
  async getDecryptedApiKey(providerId: string): Promise<string> {
    const provider = this.settings.llmProviders.find(p => p.id === providerId);
    if (!provider || !provider.apiKey) {
      throw new ValidationError(`API key not found for provider: ${providerId}`);
    }

    try {
      return this.encryptionService.decrypt(provider.apiKey);
    } catch (error) {
      console.error(`Failed to decrypt API key for provider ${providerId}:`, error);
      throw new InternalServerError('Failed to decrypt API key');
    }
  }

  /**
   * Validate API key without storing it
   */
  async validateApiKey(provider: string, apiKey: string, baseUrl?: string): Promise<boolean> {
    // This would integrate with LLMService to test the API key
    // For now, just validate format
    if (!apiKey || apiKey.length < 10) {
      return false;
    }

    // Basic format validation based on provider
    switch (provider) {
      case 'openai':
        return apiKey.startsWith('sk-') && apiKey.length > 20;
      case 'deepseek':
        return apiKey.startsWith('sk-') && apiKey.length > 20;
      case 'openrouter':
        return apiKey.startsWith('sk-or-') && apiKey.length > 30;
      default:
        return apiKey.length > 10;
    }
  }

  /**
   * Export settings for backup (excludes sensitive data)
   */
  async exportSettings(): Promise<SettingsExport> {
    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      settings: {
        preferences: this.settings.preferences,
        mcpServers: this.settings.mcpServers.map(server => ({
          ...server,
          // Remove any sensitive environment variables
          env: server.env ? this.sanitizeEnvironmentVariables(server.env) : undefined,
        })),
      },
    };
  }

  /**
   * Import settings from backup (user must re-enter API keys)
   */
  async importSettings(exportData: SettingsExport): Promise<void> {
    try {
      if (exportData.version !== '1.0.0') {
        throw new ValidationError('Unsupported settings export version');
      }

      // Import non-sensitive settings
      await this.updateSettings({
        preferences: exportData.settings.preferences,
        mcpServers: exportData.settings.mcpServers,
      });
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw new InternalServerError('Failed to import settings');
    }
  }

  /**
   * Clear all sensitive data (API keys)
   */
  async clearSensitiveData(): Promise<void> {
    this.settings.llmProviders = this.settings.llmProviders.map(provider => ({
      ...provider,
      apiKey: '',
      apiKeyHash: '',
    }));

    await this.saveSettings();
  }

  /**
   * Get settings statistics for monitoring
   */
  getStatistics(): {
    totalProviders: number;
    providersWithKeys: number;
    totalMcpServers: number;
    enabledMcpServers: number;
    lastUpdated: string;
  } {
    const providersWithKeys = this.settings.llmProviders.filter(p => p.apiKey).length;
    const enabledMcpServers = this.settings.mcpServers.filter(s => s.enabled).length;

    return {
      totalProviders: this.settings.llmProviders.length,
      providersWithKeys,
      totalMcpServers: this.settings.mcpServers.length,
      enabledMcpServers,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Private methods

  private getDefaultSettings(): SecureSettings {
    return {
      llmProviders: [
        {
          id: 'openai-1',
          name: 'openai',
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1',
          models: [
            {
              id: 'gpt-4',
              name: 'GPT-4',
              supportsToolCalling: true,
              maxTokens: 8192,
            },
            {
              id: 'gpt-3.5-turbo',
              name: 'GPT-3.5 Turbo',
              supportsToolCalling: true,
              maxTokens: 4096,
            },
          ],
        },
        {
          id: 'deepseek-1',
          name: 'deepseek',
          apiKey: '',
          baseUrl: 'https://api.deepseek.com/v1',
          models: [
            {
              id: 'deepseek-chat',
              name: 'DeepSeek Chat',
              supportsToolCalling: true,
              maxTokens: 4096,
            },
          ],
        },
        {
          id: 'openrouter-1',
          name: 'openrouter',
          apiKey: '',
          baseUrl: 'https://openrouter.ai/api/v1',
          models: [
            {
              id: 'openai/gpt-4',
              name: 'GPT-4 (OpenRouter)',
              supportsToolCalling: true,
              maxTokens: 8192,
            },
          ],
        },
      ],
      mcpServers: [
        {
          id: 'filesystem-1',
          name: 'filesystem',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
          enabled: false,
          status: 'disconnected',
        },
      ],
      preferences: {
        theme: 'system',
        language: 'en',
        autoScroll: true,
        soundEnabled: false,
      },
    };
  }

  private async ensureSettingsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.settingsDir, { recursive: true });
    } catch (error) {
      throw new InternalServerError(`Failed to create settings directory: ${error}`);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const data = await fs.readFile(this.settingsFile, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Validate and merge with defaults
      this.settings = {
        ...this.getDefaultSettings(),
        ...parsed,
      };
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, use defaults and save
        this.settings = this.getDefaultSettings();
        await this.saveSettings();
      } else {
        console.error('Failed to load settings:', error);
        throw new InternalServerError('Failed to load settings data');
      }
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const data = JSON.stringify(this.settings, null, 2);
      await fs.writeFile(this.settingsFile, data, 'utf-8');
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new InternalServerError('Failed to save settings data');
    }
  }

  private sanitizeEnvironmentVariables(env: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveKeys = ['api_key', 'secret', 'token', 'password', 'key'];
    
    for (const [key, value] of Object.entries(env)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

// Singleton instance
let settingsManagerInstance: SecureSettingsManager | null = null;

export function getSecureSettingsManager(): SecureSettingsManager {
  if (!settingsManagerInstance) {
    settingsManagerInstance = new SecureSettingsManager();
  }
  return settingsManagerInstance;
}

export async function initializeSecureSettingsManager(): Promise<SecureSettingsManager> {
  const manager = getSecureSettingsManager();
  await manager.initialize();
  return manager;
}