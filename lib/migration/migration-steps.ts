// Migration step implementations

import { promises as fs } from 'fs';
import { join } from 'path';
import { MigrationStep, MigrationOptions, MigrationResult, LegacySessionsData, LegacySettings } from './types';
import { validateLegacySessionsData, validateLegacySettings, validateMigrationEnvironment } from './validation';
import { transformChatSessions, transformSettings, validateTransformedData, normalizeTransformedData } from './data-transformer';
import { createBackup } from './backup';

/**
 * Step 1: Validate migration environment
 */
export const validateEnvironmentStep: MigrationStep = {
  id: 'validate-environment',
  name: 'Validate Migration Environment',
  description: 'Check that all required directories exist and are writable',
  required: true,
  execute: async (options: MigrationOptions): Promise<MigrationResult> => {
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      skippedCount: 0,
      errors: [],
      warnings: [],
    };

    const validation = await validateMigrationEnvironment();
    result.errors = validation.errors;
    result.warnings = validation.warnings;
    result.success = validation.valid;

    if (result.success) {
      result.migratedCount = 1;
    }

    return result;
  },
};

/**
 * Step 2: Create backup of existing data
 */
export const createBackupStep: MigrationStep = {
  id: 'create-backup',
  name: 'Create Data Backup',
  description: 'Create backup of existing chat history and settings',
  required: true,
  execute: async (options: MigrationOptions): Promise<MigrationResult> => {
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      skippedCount: 0,
      errors: [],
      warnings: [],
    };

    if (options.dryRun) {
      result.success = true;
      result.warnings.push('Dry run: backup creation skipped');
      return result;
    }

    try {
      // Collect all existing data
      const sourceData: any = {};

      // Read legacy sessions data
      const legacySessionsPaths = [
        join('backend', 'data', 'sessions', 'sessions.json'),
        join('data', 'sessions', 'sessions.json'),
      ];

      for (const path of legacySessionsPaths) {
        try {
          const content = await fs.readFile(path, 'utf-8');
          sourceData.sessions = JSON.parse(content);
          break;
        } catch {
          // Try next path
        }
      }

      // Read legacy settings data
      const legacySettingsPaths = [
        join('backend', 'data', 'settings', 'settings.json'),
        join('data', 'settings', 'settings.json'),
      ];

      for (const path of legacySettingsPaths) {
        try {
          const content = await fs.readFile(path, 'utf-8');
          sourceData.settings = JSON.parse(content);
          break;
        } catch {
          // Try next path
        }
      }

      if (!sourceData.sessions && !sourceData.settings) {
        result.warnings.push('No existing data found to backup');
        result.success = true;
        return result;
      }

      // Create backup
      const metadata = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        sourceFormat: 'legacy-vite-backend' as const,
        targetFormat: 'unified-nextjs' as const,
        migratedComponents: Object.keys(sourceData),
      };

      const backupResult = await createBackup(sourceData, metadata);
      if (!backupResult.success) {
        result.errors.push(backupResult.error || 'Failed to create backup');
        return result;
      }

      result.success = true;
      result.migratedCount = 1;
      result.rollbackData = { backupPath: backupResult.backupPath };
      result.warnings.push(`Backup created at: ${backupResult.backupPath}`);

    } catch (error) {
      result.errors.push(`Backup creation failed: ${error}`);
    }

    return result;
  },
};

/**
 * Step 3: Migrate chat history data
 */
export const migrateChatHistoryStep: MigrationStep = {
  id: 'migrate-chat-history',
  name: 'Migrate Chat History',
  description: 'Transform and migrate chat sessions to new format',
  required: false,
  execute: async (options: MigrationOptions): Promise<MigrationResult> => {
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      skippedCount: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Find and read legacy sessions data
      const legacySessionsPaths = [
        join('backend', 'data', 'sessions', 'sessions.json'),
        join('data', 'sessions', 'sessions.json'),
      ];

      let legacySessionsData: LegacySessionsData | null = null;
      let sourcePath: string | null = null;

      for (const path of legacySessionsPaths) {
        try {
          const content = await fs.readFile(path, 'utf-8');
          legacySessionsData = JSON.parse(content);
          sourcePath = path;
          break;
        } catch {
          // Try next path
        }
      }

      if (!legacySessionsData) {
        result.warnings.push('No legacy chat history found to migrate');
        result.success = true;
        return result;
      }

      // Validate legacy data
      const validation = validateLegacySessionsData(legacySessionsData);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        result.warnings.push(...validation.warnings);
        if (!options.force) {
          return result;
        }
      }

      // Transform sessions
      const { sessions, errors } = transformChatSessions(legacySessionsData.sessions);
      result.errors.push(...errors);
      result.migratedCount = sessions.length;
      result.skippedCount = Object.keys(legacySessionsData.sessions).length - sessions.length;

      // Validate transformed data
      const transformedValidation = validateTransformedData({ sessions });
      if (!transformedValidation.valid) {
        result.errors.push(...transformedValidation.errors);
        result.warnings.push(...transformedValidation.warnings);
        if (!options.force) {
          return result;
        }
      }

      // Normalize data
      const normalizedData = normalizeTransformedData({ sessions });

      if (options.dryRun) {
        result.success = true;
        result.warnings.push('Dry run: chat history migration completed (no files written)');
        return result;
      }

      // Write new format data
      const newSessionsPath = join('data', 'sessions', 'sessions.json');
      const newSessionsData = {
        sessions: normalizedData.sessions.reduce((acc: any, session: any) => {
          acc[session.id] = session;
          return acc;
        }, {}),
        metadata: {
          lastCleanup: new Date().toISOString(),
          totalSessions: normalizedData.sessions.length,
          version: '2.0.0',
          encrypted: false,
          migratedFrom: sourcePath,
          migrationDate: new Date().toISOString(),
        },
      };

      await fs.writeFile(newSessionsPath, JSON.stringify(newSessionsData, null, 2));

      result.success = true;
      result.warnings.push(`Migrated ${result.migratedCount} sessions to new format`);

    } catch (error) {
      result.errors.push(`Chat history migration failed: ${error}`);
    }

    return result;
  },

  rollback: async (rollbackData: any): Promise<MigrationResult> => {
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      skippedCount: 0,
      errors: [],
      warnings: [],
    };

    try {
      if (rollbackData?.backupPath) {
        // Restore from backup would be handled by backup utilities
        result.warnings.push('Chat history rollback requires manual backup restoration');
      }
      result.success = true;
    } catch (error) {
      result.errors.push(`Rollback failed: ${error}`);
    }

    return result;
  },
};

/**
 * Step 4: Migrate settings and configuration
 */
export const migrateSettingsStep: MigrationStep = {
  id: 'migrate-settings',
  name: 'Migrate Settings',
  description: 'Transform and migrate LLM provider and MCP server configurations',
  required: false,
  execute: async (options: MigrationOptions): Promise<MigrationResult> => {
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      skippedCount: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Find and read legacy settings data
      const legacySettingsPaths = [
        join('backend', 'data', 'settings', 'settings.json'),
        join('data', 'settings', 'settings.json'),
      ];

      let legacySettings: LegacySettings | null = null;
      let sourcePath: string | null = null;

      for (const path of legacySettingsPaths) {
        try {
          const content = await fs.readFile(path, 'utf-8');
          legacySettings = JSON.parse(content);
          sourcePath = path;
          break;
        } catch {
          // Try next path
        }
      }

      if (!legacySettings) {
        result.warnings.push('No legacy settings found to migrate');
        result.success = true;
        return result;
      }

      // Validate legacy settings
      const validation = validateLegacySettings(legacySettings);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        result.warnings.push(...validation.warnings);
        if (!options.force) {
          return result;
        }
      }

      // Transform settings
      const transformedSettings = transformSettings(legacySettings);

      // Count migrated items
      result.migratedCount = 
        transformedSettings.llmProviders.length + 
        transformedSettings.mcpServers.length + 
        1; // preferences

      // Validate transformed settings
      const transformedValidation = validateTransformedData({ settings: transformedSettings });
      if (!transformedValidation.valid) {
        result.errors.push(...transformedValidation.errors);
        result.warnings.push(...transformedValidation.warnings);
        if (!options.force) {
          return result;
        }
      }

      // Normalize settings
      const normalizedSettings = normalizeTransformedData({ settings: transformedSettings });

      if (options.dryRun) {
        result.success = true;
        result.warnings.push('Dry run: settings migration completed (no files written)');
        return result;
      }

      // Write new format settings
      const newSettingsPath = join('data', 'settings', 'settings.json');
      const newSettingsData = {
        ...normalizedSettings.settings,
        metadata: {
          version: '2.0.0',
          migratedFrom: sourcePath,
          migrationDate: new Date().toISOString(),
        },
      };

      await fs.writeFile(newSettingsPath, JSON.stringify(newSettingsData, null, 2));

      result.success = true;
      result.warnings.push(`Migrated settings with ${transformedSettings.llmProviders.length} providers and ${transformedSettings.mcpServers.length} MCP servers`);

    } catch (error) {
      result.errors.push(`Settings migration failed: ${error}`);
    }

    return result;
  },

  rollback: async (rollbackData: any): Promise<MigrationResult> => {
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      skippedCount: 0,
      errors: [],
      warnings: [],
    };

    try {
      if (rollbackData?.backupPath) {
        result.warnings.push('Settings rollback requires manual backup restoration');
      }
      result.success = true;
    } catch (error) {
      result.errors.push(`Rollback failed: ${error}`);
    }

    return result;
  },
};

/**
 * Step 5: Validate migrated data
 */
export const validateMigratedDataStep: MigrationStep = {
  id: 'validate-migrated-data',
  name: 'Validate Migrated Data',
  description: 'Verify that all migrated data is valid and accessible',
  required: true,
  execute: async (options: MigrationOptions): Promise<MigrationResult> => {
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      skippedCount: 0,
      errors: [],
      warnings: [],
    };

    try {
      let validatedCount = 0;

      // Validate migrated sessions
      try {
        const sessionsPath = join('data', 'sessions', 'sessions.json');
        const sessionsContent = await fs.readFile(sessionsPath, 'utf-8');
        const sessionsData = JSON.parse(sessionsContent);
        
        const sessionsValidation = validateTransformedData({ sessions: Object.values(sessionsData.sessions) });
        if (!sessionsValidation.valid) {
          result.errors.push(...sessionsValidation.errors);
        } else {
          validatedCount++;
          result.warnings.push(`Validated ${Object.keys(sessionsData.sessions).length} migrated sessions`);
        }
      } catch (error) {
        result.warnings.push('No migrated sessions found to validate');
      }

      // Validate migrated settings
      try {
        const settingsPath = join('data', 'settings', 'settings.json');
        const settingsContent = await fs.readFile(settingsPath, 'utf-8');
        const settingsData = JSON.parse(settingsContent);
        
        const settingsValidation = validateTransformedData({ settings: settingsData });
        if (!settingsValidation.valid) {
          result.errors.push(...settingsValidation.errors);
        } else {
          validatedCount++;
          result.warnings.push('Validated migrated settings');
        }
      } catch (error) {
        result.warnings.push('No migrated settings found to validate');
      }

      result.migratedCount = validatedCount;
      result.success = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Data validation failed: ${error}`);
    }

    return result;
  },
};

/**
 * All migration steps in order
 */
export const migrationSteps: MigrationStep[] = [
  validateEnvironmentStep,
  createBackupStep,
  migrateChatHistoryStep,
  migrateSettingsStep,
  validateMigratedDataStep,
];