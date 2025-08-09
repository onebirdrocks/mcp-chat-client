import { SecureStorage } from './secure-storage';
import { EncryptionService, EncryptedData } from './encryption';
import { LLMProviderConfig, MCPServerConfig, UserPreferences, SecuritySettings } from '../types';

export interface SecureSettings {
  llmProviders: LLMProviderConfig[];
  mcpServers: MCPServerConfig[];
  preferences: UserPreferences;
  security: SecuritySettings;
  version: string;
  lastUpdated: string;
}

export interface SettingsBackup {
  settings: SecureSettings;
  timestamp: string;
  version: string;
  checksum: string;
}

export interface SettingsValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class SecureSettingsManager {
  private storage: SecureStorage;
  private encryption: EncryptionService;
  private settings: SecureSettings | null = null;
  private settingsPassword: string;

  constructor(
    storage: SecureStorage,
    encryption: EncryptionService,
    settingsPassword: string
  ) {
    this.storage = storage;
    this.encryption = encryption;
    this.settingsPassword = settingsPassword;
  }

  /**
   * Initialize with default settings
   */
  private getDefaultSettings(): SecureSettings {
    return {
      llmProviders: [],
      mcpServers: [],
      preferences: {
        theme: 'system',
        language: 'en',
        autoScroll: true,
        soundEnabled: false,
        confirmToolCalls: true,
        showTokenCount: true,
        autoGenerateTitles: true,
        maxHistoryLength: 1000,
        exportFormat: 'json',
      },
      security: {
        encryptionEnabled: true,
        sessionTimeout: 60,
        maxRequestsPerMinute: 100,
        allowedOrigins: ['http://localhost:3000'],
        logLevel: 'info',
        auditEnabled: true,
      },
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Load settings from secure storage
   */
  async loadSettings(): Promise<SecureSettings> {
    try {
      const storedSettings = await this.storage.retrieve<SecureSettings>(
        'app_settings',
        this.settingsPassword
      );

      if (storedSettings) {
        // Validate and migrate if necessary
        const validatedSettings = await this.validateAndMigrateSettings(storedSettings);
        this.settings = validatedSettings;
        return validatedSettings;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }

    // Return default settings if loading fails
    const defaultSettings = this.getDefaultSettings();
    this.settings = defaultSettings;
    await this.saveSettings(); // Save defaults
    return defaultSettings;
  }

  /**
   * Save settings to secure storage
   */
  async saveSettings(settings?: SecureSettings): Promise<void> {
    const settingsToSave = settings || this.settings;
    if (!settingsToSave) {
      throw new Error('No settings to save');
    }

    settingsToSave.lastUpdated = new Date().toISOString();
    
    // Encrypt sensitive data before saving (this creates a copy, doesn't modify original)
    const encryptedSettings = await this.encryptSensitiveData(settingsToSave);
    
    await this.storage.store('app_settings', encryptedSettings, this.settingsPassword);
    this.settings = settingsToSave;
  }

  /**
   * Get current settings
   */
  getSettings(): SecureSettings {
    if (!this.settings) {
      throw new Error('Settings not loaded. Call loadSettings() first.');
    }
    return { ...this.settings };
  }

  /**
   * Update LLM provider configuration
   */
  async updateLLMProvider(provider: LLMProviderConfig): Promise<void> {
    if (!this.settings) {
      await this.loadSettings();
    }

    const existingIndex = this.settings!.llmProviders.findIndex(p => p.id === provider.id);
    
    if (existingIndex >= 0) {
      this.settings!.llmProviders[existingIndex] = provider;
    } else {
      this.settings!.llmProviders.push(provider);
    }

    await this.saveSettings();
  }

  /**
   * Remove LLM provider
   */
  async removeLLMProvider(providerId: string): Promise<void> {
    if (!this.settings) {
      await this.loadSettings();
    }

    this.settings!.llmProviders = this.settings!.llmProviders.filter(p => p.id !== providerId);
    await this.saveSettings();
  }

  /**
   * Update MCP server configuration
   */
  async updateMCPServer(server: MCPServerConfig): Promise<void> {
    if (!this.settings) {
      await this.loadSettings();
    }

    const existingIndex = this.settings!.mcpServers.findIndex(s => s.id === server.id);
    
    if (existingIndex >= 0) {
      this.settings!.mcpServers[existingIndex] = server;
    } else {
      this.settings!.mcpServers.push(server);
    }

    await this.saveSettings();
  }

  /**
   * Remove MCP server
   */
  async removeMCPServer(serverId: string): Promise<void> {
    if (!this.settings) {
      await this.loadSettings();
    }

    this.settings!.mcpServers = this.settings!.mcpServers.filter(s => s.id !== serverId);
    await this.saveSettings();
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    if (!this.settings) {
      await this.loadSettings();
    }

    this.settings!.preferences = { ...this.settings!.preferences, ...preferences };
    await this.saveSettings();
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(security: Partial<SecuritySettings>): Promise<void> {
    if (!this.settings) {
      await this.loadSettings();
    }

    this.settings!.security = { ...this.settings!.security, ...security };
    await this.saveSettings();
  }

  /**
   * Encrypt sensitive data in settings
   */
  private async encryptSensitiveData(settings: SecureSettings): Promise<SecureSettings> {
    // Create a deep copy to avoid modifying the original
    const encryptedSettings = JSON.parse(JSON.stringify(settings));

    // Encrypt API keys in LLM providers
    for (const provider of encryptedSettings.llmProviders) {
      if (provider.apiKey && typeof provider.apiKey === 'string') {
        const encrypted = await this.encryption.encrypt(provider.apiKey, this.settingsPassword);
        provider.apiKey = encrypted as any; // Store as EncryptedData
      }
    }

    return encryptedSettings;
  }

  /**
   * Decrypt sensitive data in settings
   */
  private async decryptSensitiveData(settings: SecureSettings): Promise<SecureSettings> {
    const decryptedSettings = { ...settings };

    // Decrypt API keys in LLM providers
    for (const provider of decryptedSettings.llmProviders) {
      if (provider.apiKey && typeof provider.apiKey === 'object') {
        const decrypted = await this.encryption.decrypt(
          provider.apiKey as EncryptedData,
          this.settingsPassword
        );
        provider.apiKey = decrypted;
      }
    }

    return decryptedSettings;
  }

  /**
   * Validate and migrate settings
   */
  private async validateAndMigrateSettings(settings: SecureSettings): Promise<SecureSettings> {
    const validation = this.validateSettings(settings);
    
    if (!validation.valid) {
      console.warn('Settings validation failed:', validation.errors);
      // Apply fixes or use defaults for invalid settings
      const defaultSettings = this.getDefaultSettings();
      return {
        ...defaultSettings,
        ...settings,
        preferences: { ...defaultSettings.preferences, ...settings.preferences },
        security: { ...defaultSettings.security, ...settings.security },
      };
    }

    // Decrypt sensitive data for use
    return await this.decryptSensitiveData(settings);
  }

  /**
   * Validate settings structure and values
   */
  validateSettings(settings: SecureSettings): SettingsValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate version
    if (!settings.version) {
      errors.push('Settings version is missing');
    }

    // Validate LLM providers
    if (!Array.isArray(settings.llmProviders)) {
      errors.push('LLM providers must be an array');
    } else {
      settings.llmProviders.forEach((provider, index) => {
        if (!provider.id) {
          errors.push(`LLM provider at index ${index} is missing ID`);
        }
        if (!provider.name) {
          errors.push(`LLM provider at index ${index} is missing name`);
        }
        if (!provider.apiKey) {
          warnings.push(`LLM provider ${provider.id} is missing API key`);
        }
      });
    }

    // Validate MCP servers
    if (!Array.isArray(settings.mcpServers)) {
      errors.push('MCP servers must be an array');
    } else {
      settings.mcpServers.forEach((server, index) => {
        if (!server.id) {
          errors.push(`MCP server at index ${index} is missing ID`);
        }
        if (!server.command) {
          errors.push(`MCP server at index ${index} is missing command`);
        }
      });
    }

    // Validate preferences
    if (!settings.preferences) {
      errors.push('User preferences are missing');
    } else {
      const prefs = settings.preferences;
      if (!['light', 'dark', 'system'].includes(prefs.theme)) {
        warnings.push('Invalid theme preference, using default');
      }
      if (!['en', 'zh'].includes(prefs.language)) {
        warnings.push('Invalid language preference, using default');
      }
    }

    // Validate security settings
    if (!settings.security) {
      errors.push('Security settings are missing');
    } else {
      const security = settings.security;
      if (security.sessionTimeout < 5 || security.sessionTimeout > 1440) {
        warnings.push('Session timeout should be between 5 and 1440 minutes');
      }
      if (security.maxRequestsPerMinute < 1 || security.maxRequestsPerMinute > 1000) {
        warnings.push('Max requests per minute should be between 1 and 1000');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Create settings backup
   */
  async createBackup(): Promise<SettingsBackup> {
    if (!this.settings) {
      await this.loadSettings();
    }

    // Create a deep copy to avoid modifying the original
    const settingsCopy = JSON.parse(JSON.stringify(this.settings!));
    
    const backup: SettingsBackup = {
      settings: settingsCopy,
      timestamp: new Date().toISOString(),
      version: this.settings!.version,
      checksum: this.encryption.generateHash(JSON.stringify(settingsCopy)),
    };

    // Store backup
    const backupKey = `settings_backup_${Date.now()}`;
    await this.storage.store(backupKey, backup, this.settingsPassword);

    return backup;
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backup: SettingsBackup): Promise<void> {
    // Verify backup integrity
    const computedChecksum = this.encryption.generateHash(JSON.stringify(backup.settings));
    if (computedChecksum !== backup.checksum) {
      throw new Error('Backup integrity check failed');
    }

    // Validate backup settings
    const validation = this.validateSettings(backup.settings);
    if (!validation.valid) {
      throw new Error(`Invalid backup settings: ${validation.errors.join(', ')}`);
    }

    // Create current backup before restoring
    await this.createBackup();

    // Restore settings
    this.settings = backup.settings;
    await this.saveSettings();
  }

  /**
   * Export settings (without sensitive data)
   */
  async exportSettings(includeSensitive: boolean = false): Promise<string> {
    if (!this.settings) {
      await this.loadSettings();
    }

    const exportData = JSON.parse(JSON.stringify(this.settings!));

    if (!includeSensitive) {
      // Remove sensitive data
      exportData.llmProviders = exportData.llmProviders.map((provider: any) => ({
        ...provider,
        apiKey: provider.apiKey ? '***REDACTED***' : '',
      }));
    } else {
      // For sensitive export, decrypt API keys if they're encrypted
      for (const provider of exportData.llmProviders) {
        if (provider.apiKey && typeof provider.apiKey === 'object') {
          try {
            provider.apiKey = await this.encryption.decrypt(provider.apiKey as EncryptedData, this.settingsPassword);
          } catch (error) {
            provider.apiKey = '***DECRYPTION_FAILED***';
          }
        }
      }
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import settings
   */
  async importSettings(settingsJson: string, password?: string): Promise<void> {
    try {
      const importedSettings: SecureSettings = JSON.parse(settingsJson);
      
      // Validate imported settings
      const validation = this.validateSettings(importedSettings);
      if (!validation.valid) {
        throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
      }

      // Create backup before importing
      await this.createBackup();

      // Import settings
      this.settings = importedSettings;
      await this.saveSettings();
    } catch (error) {
      throw new Error(`Failed to import settings: ${error}`);
    }
  }

  /**
   * Reset to default settings
   */
  async resetToDefaults(): Promise<void> {
    // Create backup before resetting
    if (this.settings) {
      await this.createBackup();
    }

    this.settings = this.getDefaultSettings();
    await this.saveSettings();
  }

  /**
   * Get masked API key for display
   */
  getMaskedApiKey(providerId: string): string {
    if (!this.settings) {
      return '****';
    }

    const provider = this.settings.llmProviders.find(p => p.id === providerId);
    if (!provider || !provider.apiKey) {
      return '****';
    }

    // If the API key is encrypted (object), we can't mask it properly
    if (typeof provider.apiKey === 'object') {
      return '****[ENCRYPTED]';
    }
    
    const apiKey = provider.apiKey as string;
    return apiKey.length > 8 ? `****${apiKey.slice(-4)}` : '****';
  }

  /**
   * Test API key validity
   */
  async testApiKey(providerId: string): Promise<{ valid: boolean; error?: string }> {
    if (!this.settings) {
      await this.loadSettings();
    }

    const provider = this.settings!.llmProviders.find(p => p.id === providerId);
    if (!provider || !provider.apiKey) {
      return { valid: false, error: 'Provider or API key not found' };
    }

    // This would typically make a test API call
    // For now, just check if the key exists and has reasonable format
    let apiKey: string;
    
    if (typeof provider.apiKey === 'object') {
      // If encrypted, we assume it's valid if it can be decrypted
      try {
        apiKey = await this.encryption.decrypt(provider.apiKey as EncryptedData, this.settingsPassword);
      } catch {
        return { valid: false, error: 'Failed to decrypt API key' };
      }
    } else {
      apiKey = provider.apiKey as string;
    }

    if (apiKey.length < 10) {
      return { valid: false, error: 'API key too short' };
    }

    return { valid: true };
  }

  /**
   * Clean up sensitive data from memory
   */
  cleanup(): void {
    if (this.settings) {
      // Clear API keys from memory
      this.settings.llmProviders.forEach(provider => {
        if (typeof provider.apiKey === 'string') {
          provider.apiKey = '';
        }
      });
    }
    this.settings = null;
  }
}