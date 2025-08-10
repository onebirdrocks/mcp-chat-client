// User data preservation utilities for migration

import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { MigrationResult, ValidationResult } from './types';
import { validateDataIntegrity } from './validation';

export interface UserDataInventory {
  chatSessions: {
    count: number;
    totalMessages: number;
    dateRange: {
      earliest: string;
      latest: string;
    };
    providers: string[];
    models: string[];
    hasToolCalls: boolean;
  };
  settings: {
    llmProviders: number;
    mcpServers: number;
    hasEncryptedKeys: boolean;
    preferences: string[];
  };
  totalDataSize: number;
  lastModified: string;
}

export interface DataPreservationOptions {
  preserveEncryption: boolean;
  validateIntegrity: boolean;
  createChecksums: boolean;
  preserveTimestamps: boolean;
  preserveMetadata: boolean;
}

/**
 * Creates an inventory of existing user data
 */
export async function createUserDataInventory(): Promise<{
  inventory: UserDataInventory | null;
  error?: string;
}> {
  try {
    const inventory: UserDataInventory = {
      chatSessions: {
        count: 0,
        totalMessages: 0,
        dateRange: { earliest: '', latest: '' },
        providers: [],
        models: [],
        hasToolCalls: false,
      },
      settings: {
        llmProviders: 0,
        mcpServers: 0,
        hasEncryptedKeys: false,
        preferences: [],
      },
      totalDataSize: 0,
      lastModified: '',
    };

    let totalSize = 0;
    let latestModified = new Date(0);

    // Analyze chat sessions
    const sessionsPaths = [
      join('backend', 'data', 'sessions', 'sessions.json'),
      join('data', 'sessions', 'sessions.json'),
    ];

    for (const path of sessionsPaths) {
      try {
        const stats = await fs.stat(path);
        const content = await fs.readFile(path, 'utf-8');
        const data = JSON.parse(content);

        totalSize += stats.size;
        if (stats.mtime > latestModified) {
          latestModified = stats.mtime;
        }

        if (data.sessions) {
          const sessions = Object.values(data.sessions) as any[];
          inventory.chatSessions.count = sessions.length;

          let totalMessages = 0;
          let earliestDate = new Date();
          let latestDate = new Date(0);
          const providers = new Set<string>();
          const models = new Set<string>();
          let hasToolCalls = false;

          sessions.forEach((session: any) => {
            if (session.messages) {
              totalMessages += session.messages.length;
              
              // Check for tool calls
              session.messages.forEach((msg: any) => {
                if (msg.toolCalls && msg.toolCalls.length > 0) {
                  hasToolCalls = true;
                }
              });
            }

            if (session.provider) providers.add(session.provider);
            if (session.model) models.add(session.model);

            const createdAt = new Date(session.createdAt);
            if (createdAt < earliestDate) earliestDate = createdAt;
            if (createdAt > latestDate) latestDate = createdAt;
          });

          inventory.chatSessions.totalMessages = totalMessages;
          inventory.chatSessions.dateRange = {
            earliest: earliestDate.toISOString(),
            latest: latestDate.toISOString(),
          };
          inventory.chatSessions.providers = Array.from(providers);
          inventory.chatSessions.models = Array.from(models);
          inventory.chatSessions.hasToolCalls = hasToolCalls;
        }
        break; // Use first found file
      } catch {
        // Try next path
      }
    }

    // Analyze settings
    const settingsPaths = [
      join('backend', 'data', 'settings', 'settings.json'),
      join('data', 'settings', 'settings.json'),
    ];

    for (const path of settingsPaths) {
      try {
        const stats = await fs.stat(path);
        const content = await fs.readFile(path, 'utf-8');
        const data = JSON.parse(content);

        totalSize += stats.size;
        if (stats.mtime > latestModified) {
          latestModified = stats.mtime;
        }

        if (data.llmProviders) {
          inventory.settings.llmProviders = data.llmProviders.length;
          
          // Check for encrypted API keys
          const hasEncrypted = data.llmProviders.some((p: any) => 
            p.apiKey && (p.apiKey.startsWith('U2FsdGVkX1') || p.apiKeyHash)
          );
          inventory.settings.hasEncryptedKeys = hasEncrypted;
        }

        if (data.mcpServers) {
          inventory.settings.mcpServers = data.mcpServers.length;
        }

        if (data.preferences) {
          inventory.settings.preferences = Object.keys(data.preferences);
        }

        break; // Use first found file
      } catch {
        // Try next path
      }
    }

    inventory.totalDataSize = totalSize;
    inventory.lastModified = latestModified.toISOString();

    return { inventory };
  } catch (error) {
    return { inventory: null, error: `Failed to create inventory: ${error}` };
  }
}

/**
 * Preserves existing chat sessions during migration
 */
export async function preserveChatSessions(
  options: DataPreservationOptions = {
    preserveEncryption: true,
    validateIntegrity: true,
    createChecksums: true,
    preserveTimestamps: true,
    preserveMetadata: true,
  }
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    skippedCount: 0,
    errors: [],
    warnings: [],
  };

  try {
    // Find existing sessions data
    const sourcePaths = [
      join('backend', 'data', 'sessions', 'sessions.json'),
      join('data', 'sessions', 'sessions.json'),
    ];

    let sourceData: any = null;
    let sourcePath: string | null = null;

    for (const path of sourcePaths) {
      try {
        const content = await fs.readFile(path, 'utf-8');
        sourceData = JSON.parse(content);
        sourcePath = path;
        break;
      } catch {
        // Try next path
      }
    }

    if (!sourceData) {
      result.warnings.push('No existing chat sessions found to preserve');
      result.success = true;
      return result;
    }

    // Validate data integrity if requested
    if (options.validateIntegrity) {
      const validation = validateDataIntegrity(sourceData);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        result.warnings.push(...validation.warnings);
      }
    }

    // Create checksums if requested
    let checksums: Record<string, string> = {};
    if (options.createChecksums) {
      if (sourceData.sessions) {
        Object.keys(sourceData.sessions).forEach(sessionId => {
          const sessionData = sourceData.sessions[sessionId];
          checksums[sessionId] = createHash('sha256')
            .update(JSON.stringify(sessionData))
            .digest('hex');
        });
      }
    }

    // Preserve sessions with enhanced metadata
    const preservedSessions: any = {};
    let preservedCount = 0;

    if (sourceData.sessions) {
      Object.entries(sourceData.sessions).forEach(([sessionId, sessionData]: [string, any]) => {
        try {
          const preservedSession = { ...sessionData };

          // Preserve timestamps
          if (options.preserveTimestamps) {
            preservedSession.originalCreatedAt = sessionData.createdAt;
            preservedSession.originalUpdatedAt = sessionData.updatedAt;
          }

          // Preserve metadata
          if (options.preserveMetadata) {
            preservedSession.preservationMetadata = {
              originalSource: sourcePath,
              preservedAt: new Date().toISOString(),
              checksum: checksums[sessionId],
              originalFormat: 'legacy',
            };
          }

          // Preserve message integrity
          if (preservedSession.messages) {
            preservedSession.messages = preservedSession.messages.map((msg: any) => ({
              ...msg,
              preservationMetadata: options.preserveMetadata ? {
                originalTimestamp: msg.timestamp,
                preservedAt: new Date().toISOString(),
              } : undefined,
            }));
          }

          preservedSessions[sessionId] = preservedSession;
          preservedCount++;
        } catch (error) {
          result.errors.push(`Failed to preserve session ${sessionId}: ${error}`);
          result.skippedCount++;
        }
      });
    }

    // Create preserved data structure
    const preservedData = {
      sessions: preservedSessions,
      metadata: {
        ...sourceData.metadata,
        preservationInfo: {
          preservedAt: new Date().toISOString(),
          preservedFrom: sourcePath,
          preservationOptions: options,
          totalPreserved: preservedCount,
          checksums: options.createChecksums ? checksums : undefined,
        },
      },
    };

    // Ensure target directory exists
    const targetDir = join('data', 'sessions');
    await fs.mkdir(targetDir, { recursive: true });

    // Write preserved data
    const targetPath = join(targetDir, 'sessions.json');
    await fs.writeFile(targetPath, JSON.stringify(preservedData, null, 2));

    result.migratedCount = preservedCount;
    result.success = true;
    result.warnings.push(`Preserved ${preservedCount} chat sessions with integrity protection`);

  } catch (error) {
    result.errors.push(`Chat session preservation failed: ${error}`);
  }

  return result;
}

/**
 * Preserves user preferences and settings during migration
 */
export async function preserveUserSettings(
  options: DataPreservationOptions = {
    preserveEncryption: true,
    validateIntegrity: true,
    createChecksums: true,
    preserveTimestamps: true,
    preserveMetadata: true,
  }
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    skippedCount: 0,
    errors: [],
    warnings: [],
  };

  try {
    // Find existing settings data
    const sourcePaths = [
      join('backend', 'data', 'settings', 'settings.json'),
      join('data', 'settings', 'settings.json'),
    ];

    let sourceData: any = null;
    let sourcePath: string | null = null;

    for (const path of sourcePaths) {
      try {
        const content = await fs.readFile(path, 'utf-8');
        sourceData = JSON.parse(content);
        sourcePath = path;
        break;
      } catch {
        // Try next path
      }
    }

    if (!sourceData) {
      result.warnings.push('No existing settings found to preserve');
      result.success = true;
      return result;
    }

    // Validate data integrity
    if (options.validateIntegrity) {
      const validation = validateDataIntegrity(sourceData);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        result.warnings.push(...validation.warnings);
      }
    }

    // Preserve API key configurations with encryption
    const preservedProviders: any[] = [];
    if (sourceData.llmProviders) {
      sourceData.llmProviders.forEach((provider: any) => {
        try {
          const preservedProvider = { ...provider };

          // Preserve encryption if requested
          if (options.preserveEncryption && provider.apiKey) {
            // Keep encrypted API keys as-is
            if (provider.apiKey.startsWith('U2FsdGVkX1') || provider.apiKeyHash) {
              result.warnings.push(`Preserved encrypted API key for provider ${provider.name}`);
            } else {
              result.warnings.push(`API key for provider ${provider.name} may need re-encryption`);
            }
          }

          // Add preservation metadata
          if (options.preserveMetadata) {
            preservedProvider.preservationMetadata = {
              originalSource: sourcePath,
              preservedAt: new Date().toISOString(),
              hadEncryptedKey: !!(provider.apiKey && (provider.apiKey.startsWith('U2FsdGVkX1') || provider.apiKeyHash)),
            };
          }

          preservedProviders.push(preservedProvider);
          result.migratedCount++;
        } catch (error) {
          result.errors.push(`Failed to preserve provider ${provider.id}: ${error}`);
          result.skippedCount++;
        }
      });
    }

    // Preserve MCP server configurations
    const preservedServers: any[] = [];
    if (sourceData.mcpServers) {
      sourceData.mcpServers.forEach((server: any) => {
        try {
          const preservedServer = { ...server };

          // Add preservation metadata
          if (options.preserveMetadata) {
            preservedServer.preservationMetadata = {
              originalSource: sourcePath,
              preservedAt: new Date().toISOString(),
              originalFormat: 'legacy',
            };
          }

          preservedServers.push(preservedServer);
          result.migratedCount++;
        } catch (error) {
          result.errors.push(`Failed to preserve MCP server ${server.id}: ${error}`);
          result.skippedCount++;
        }
      });
    }

    // Preserve user preferences
    let preservedPreferences: any = {};
    if (sourceData.preferences) {
      preservedPreferences = { ...sourceData.preferences };

      // Add preservation metadata
      if (options.preserveMetadata) {
        preservedPreferences.preservationMetadata = {
          originalSource: sourcePath,
          preservedAt: new Date().toISOString(),
          originalKeys: Object.keys(sourceData.preferences),
        };
      }

      result.migratedCount++;
    }

    // Create preserved settings structure
    const preservedSettings = {
      llmProviders: preservedProviders,
      mcpServers: preservedServers,
      preferences: preservedPreferences,
      metadata: {
        version: '2.0.0',
        preservationInfo: {
          preservedAt: new Date().toISOString(),
          preservedFrom: sourcePath,
          preservationOptions: options,
          totalProviders: preservedProviders.length,
          totalServers: preservedServers.length,
          hasPreferences: Object.keys(preservedPreferences).length > 0,
        },
      },
    };

    // Ensure target directory exists
    const targetDir = join('data', 'settings');
    await fs.mkdir(targetDir, { recursive: true });

    // Write preserved settings
    const targetPath = join(targetDir, 'settings.json');
    await fs.writeFile(targetPath, JSON.stringify(preservedSettings, null, 2));

    result.success = true;
    result.warnings.push(`Preserved ${preservedProviders.length} LLM providers, ${preservedServers.length} MCP servers, and user preferences`);

  } catch (error) {
    result.errors.push(`Settings preservation failed: ${error}`);
  }

  return result;
}

/**
 * Converts existing API key configurations to new encrypted storage format
 */
export async function migrateApiKeyStorage(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    skippedCount: 0,
    errors: [],
    warnings: [],
  };

  try {
    // This would integrate with the existing encryption service
    const { SecureSettingsManager } = await import('../security/secure-settings-manager');
    const settingsManager = new SecureSettingsManager();

    // Find existing settings
    const sourcePaths = [
      join('backend', 'data', 'settings', 'settings.json'),
      join('data', 'settings', 'settings.json'),
    ];

    let sourceData: any = null;
    for (const path of sourcePaths) {
      try {
        const content = await fs.readFile(path, 'utf-8');
        sourceData = JSON.parse(content);
        break;
      } catch {
        // Try next path
      }
    }

    if (!sourceData || !sourceData.llmProviders) {
      result.warnings.push('No API keys found to migrate');
      result.success = true;
      return result;
    }

    // Migrate each provider's API key
    for (const provider of sourceData.llmProviders) {
      try {
        if (provider.apiKey) {
          // Check if already encrypted
          if (provider.apiKey.startsWith('U2FsdGVkX1') || provider.apiKeyHash) {
            result.warnings.push(`API key for ${provider.name} is already encrypted`);
            result.skippedCount++;
          } else {
            // Re-encrypt with new system
            await settingsManager.setProviderApiKey(provider.id, provider.apiKey);
            result.migratedCount++;
            result.warnings.push(`Migrated API key for ${provider.name} to new encryption format`);
          }
        }
      } catch (error) {
        result.errors.push(`Failed to migrate API key for ${provider.name}: ${error}`);
        result.skippedCount++;
      }
    }

    result.success = result.errors.length === 0;

  } catch (error) {
    result.errors.push(`API key migration failed: ${error}`);
  }

  return result;
}

/**
 * Preserves MCP server configurations in new format
 */
export async function preserveMCPServerConfigurations(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    skippedCount: 0,
    errors: [],
    warnings: [],
  };

  try {
    // Read existing MCP configuration
    const configPaths = [
      join('config', 'mcp.config.json'),
      join('backend', 'config', 'mcp.config.json'),
    ];

    let mcpConfig: any = null;
    for (const path of configPaths) {
      try {
        const content = await fs.readFile(path, 'utf-8');
        mcpConfig = JSON.parse(content);
        break;
      } catch {
        // Try next path
      }
    }

    // Also check settings for MCP servers
    const settingsPaths = [
      join('backend', 'data', 'settings', 'settings.json'),
      join('data', 'settings', 'settings.json'),
    ];

    let settingsData: any = null;
    for (const path of settingsPaths) {
      try {
        const content = await fs.readFile(path, 'utf-8');
        settingsData = JSON.parse(content);
        break;
      } catch {
        // Try next path
      }
    }

    const preservedServers: any[] = [];

    // Preserve from MCP config
    if (mcpConfig && mcpConfig.mcpServers) {
      Object.entries(mcpConfig.mcpServers).forEach(([serverId, serverConfig]: [string, any]) => {
        preservedServers.push({
          id: serverId,
          name: serverId,
          command: serverConfig.command,
          args: serverConfig.args || [],
          env: serverConfig.env || {},
          enabled: true,
          preservationMetadata: {
            source: 'mcp.config.json',
            preservedAt: new Date().toISOString(),
          },
        });
        result.migratedCount++;
      });
    }

    // Preserve from settings
    if (settingsData && settingsData.mcpServers) {
      settingsData.mcpServers.forEach((server: any) => {
        // Avoid duplicates
        if (!preservedServers.find(s => s.id === server.id)) {
          preservedServers.push({
            ...server,
            preservationMetadata: {
              source: 'settings.json',
              preservedAt: new Date().toISOString(),
            },
          });
          result.migratedCount++;
        }
      });
    }

    if (preservedServers.length === 0) {
      result.warnings.push('No MCP server configurations found to preserve');
      result.success = true;
      return result;
    }

    // Ensure target config directory exists
    const targetConfigDir = join('config');
    await fs.mkdir(targetConfigDir, { recursive: true });

    // Write preserved MCP configuration
    const preservedConfig = {
      mcpServers: preservedServers.reduce((acc: any, server: any) => {
        acc[server.id] = {
          command: server.command,
          args: server.args,
          env: server.env,
        };
        return acc;
      }, {}),
      metadata: {
        preservedAt: new Date().toISOString(),
        totalServers: preservedServers.length,
        version: '2.0.0',
      },
    };

    const targetConfigPath = join(targetConfigDir, 'mcp.config.json');
    await fs.writeFile(targetConfigPath, JSON.stringify(preservedConfig, null, 2));

    result.success = true;
    result.warnings.push(`Preserved ${preservedServers.length} MCP server configurations`);

  } catch (error) {
    result.errors.push(`MCP configuration preservation failed: ${error}`);
  }

  return result;
}

/**
 * Validates that all user data has been preserved correctly
 */
export async function validateDataPreservation(): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    // Check that preserved sessions exist and are valid
    try {
      const sessionsPath = join('data', 'sessions', 'sessions.json');
      const sessionsContent = await fs.readFile(sessionsPath, 'utf-8');
      const sessionsData = JSON.parse(sessionsContent);

      if (!sessionsData.sessions) {
        result.warnings.push('No preserved sessions found');
      } else {
        const sessionCount = Object.keys(sessionsData.sessions).length;
        result.warnings.push(`Found ${sessionCount} preserved sessions`);

        // Validate preservation metadata
        Object.values(sessionsData.sessions).forEach((session: any, index) => {
          if (!session.preservationMetadata) {
            result.warnings.push(`Session at index ${index} missing preservation metadata`);
          }
        });
      }
    } catch (error) {
      result.errors.push(`Cannot validate preserved sessions: ${error}`);
      result.valid = false;
    }

    // Check that preserved settings exist and are valid
    try {
      const settingsPath = join('data', 'settings', 'settings.json');
      const settingsContent = await fs.readFile(settingsPath, 'utf-8');
      const settingsData = JSON.parse(settingsContent);

      if (!settingsData.llmProviders && !settingsData.mcpServers && !settingsData.preferences) {
        result.warnings.push('No preserved settings found');
      } else {
        result.warnings.push(`Found preserved settings with ${settingsData.llmProviders?.length || 0} providers`);
      }
    } catch (error) {
      result.errors.push(`Cannot validate preserved settings: ${error}`);
      result.valid = false;
    }

    // Check that MCP configuration is preserved
    try {
      const mcpConfigPath = join('config', 'mcp.config.json');
      const mcpContent = await fs.readFile(mcpConfigPath, 'utf-8');
      const mcpData = JSON.parse(mcpContent);

      if (!mcpData.mcpServers) {
        result.warnings.push('No preserved MCP configuration found');
      } else {
        const serverCount = Object.keys(mcpData.mcpServers).length;
        result.warnings.push(`Found ${serverCount} preserved MCP servers`);
      }
    } catch (error) {
      result.warnings.push('No MCP configuration found (this may be normal)');
    }

  } catch (error) {
    result.errors.push(`Data preservation validation failed: ${error}`);
    result.valid = false;
  }

  return result;
}