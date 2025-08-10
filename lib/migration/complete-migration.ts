// Complete migration orchestrator with user data preservation

import { 
  MigrationResult, 
  MigrationOptions, 
  MigrationProgress 
} from './types';
import { MigrationRunner } from './migration-runner';
import { 
  createUserDataInventory,
  preserveChatSessions,
  preserveUserSettings,
  migrateApiKeyStorage,
  preserveMCPServerConfigurations,
  validateDataPreservation,
  DataPreservationOptions
} from './user-data-preservation';
import { createBackup } from './backup';

export interface CompleteMigrationOptions extends MigrationOptions {
  preservationOptions?: DataPreservationOptions;
  skipDataPreservation?: boolean;
  generateInventory?: boolean;
}

export interface CompleteMigrationResult extends MigrationResult {
  inventory?: any;
  preservationResults?: {
    sessions: MigrationResult;
    settings: MigrationResult;
    apiKeys: MigrationResult;
    mcpConfig: MigrationResult;
  };
  validationResult?: any;
}

/**
 * Runs complete migration with comprehensive user data preservation
 */
export async function runCompleteMigration(
  options: CompleteMigrationOptions = {},
  onProgress?: (progress: MigrationProgress & { stage: string }) => void
): Promise<CompleteMigrationResult> {
  const result: CompleteMigrationResult = {
    success: false,
    migratedCount: 0,
    skippedCount: 0,
    errors: [],
    warnings: [],
  };

  const preservationOptions: DataPreservationOptions = {
    preserveEncryption: true,
    validateIntegrity: true,
    createChecksums: true,
    preserveTimestamps: true,
    preserveMetadata: true,
    ...options.preservationOptions,
  };

  try {
    // Stage 1: Create inventory of existing data
    if (options.generateInventory !== false) {
      onProgress?.({ 
        currentStep: 1, 
        totalSteps: 6, 
        stepName: 'Data Inventory', 
        stepDescription: 'Creating inventory of existing user data',
        progress: 0,
        status: 'running',
        results: [],
        errors: [],
        warnings: [],
        stage: 'inventory'
      });

      const { inventory, error } = await createUserDataInventory();
      if (error) {
        result.errors.push(`Inventory creation failed: ${error}`);
      } else {
        result.inventory = inventory;
        result.warnings.push(`Inventory created: ${inventory?.chatSessions.count || 0} sessions, ${inventory?.settings.llmProviders || 0} providers`);
      }
    }

    // Stage 2: Create comprehensive backup
    onProgress?.({ 
      currentStep: 2, 
      totalSteps: 6, 
      stepName: 'Backup Creation', 
      stepDescription: 'Creating comprehensive backup of all user data',
      progress: 16,
      status: 'running',
      results: [],
      errors: [],
      warnings: [],
      stage: 'backup'
    });

    if (options.createBackup !== false && !options.dryRun) {
      // Collect all data for backup
      const allData: any = {};
      
      // Try to read all possible data sources
      const fs = require('fs').promises;
      const path = require('path');

      const dataSources = [
        { path: path.join('backend', 'data', 'sessions', 'sessions.json'), key: 'backendSessions' },
        { path: path.join('backend', 'data', 'settings', 'settings.json'), key: 'backendSettings' },
        { path: path.join('data', 'sessions', 'sessions.json'), key: 'sessions' },
        { path: path.join('data', 'settings', 'settings.json'), key: 'settings' },
        { path: path.join('config', 'mcp.config.json'), key: 'mcpConfig' },
      ];

      for (const source of dataSources) {
        try {
          const content = await fs.readFile(source.path, 'utf-8');
          allData[source.key] = JSON.parse(content);
        } catch {
          // File doesn't exist, skip
        }
      }

      const metadata = {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        sourceFormat: 'mixed' as const,
        targetFormat: 'unified-nextjs' as const,
        migratedComponents: Object.keys(allData),
      };

      const backupResult = await createBackup(allData, metadata);
      if (!backupResult.success) {
        result.errors.push(`Backup creation failed: ${backupResult.error}`);
      } else {
        result.warnings.push(`Comprehensive backup created: ${backupResult.backupPath}`);
      }
    }

    // Stage 3: Preserve user data with integrity protection
    if (!options.skipDataPreservation) {
      onProgress?.({ 
        currentStep: 3, 
        totalSteps: 6, 
        stepName: 'Data Preservation', 
        stepDescription: 'Preserving user data with integrity protection',
        progress: 33,
        status: 'running',
        results: [],
        errors: [],
        warnings: [],
        stage: 'preservation'
      });

      const preservationResults = {
        sessions: await preserveChatSessions(preservationOptions),
        settings: await preserveUserSettings(preservationOptions),
        apiKeys: await migrateApiKeyStorage(),
        mcpConfig: await preserveMCPServerConfigurations(),
      };

      result.preservationResults = preservationResults;

      // Accumulate results
      Object.values(preservationResults).forEach(pr => {
        result.migratedCount += pr.migratedCount;
        result.skippedCount += pr.skippedCount;
        result.errors.push(...pr.errors);
        result.warnings.push(...pr.warnings);
      });
    }

    // Stage 4: Run standard migration steps
    onProgress?.({ 
      currentStep: 4, 
      totalSteps: 6, 
      stepName: 'Core Migration', 
      stepDescription: 'Running core migration steps',
      progress: 50,
      status: 'running',
      results: [],
      errors: [],
      warnings: [],
      stage: 'migration'
    });

    const migrationRunner = new MigrationRunner(undefined, {
      ...options,
      createBackup: false, // Already created comprehensive backup
    });

    const migrationResult = await migrationRunner.execute((progress) => {
      onProgress?.({
        ...progress,
        currentStep: 4,
        totalSteps: 6,
        progress: 50 + (progress.progress * 0.3), // Scale to 50-80%
        stage: 'migration'
      });
    });

    // Accumulate migration results
    result.migratedCount += migrationResult.migratedCount;
    result.skippedCount += migrationResult.skippedCount;
    result.errors.push(...migrationResult.errors);
    result.warnings.push(...migrationResult.warnings);

    // Stage 5: Validate data preservation
    onProgress?.({ 
      currentStep: 5, 
      totalSteps: 6, 
      stepName: 'Validation', 
      stepDescription: 'Validating data preservation and integrity',
      progress: 83,
      status: 'running',
      results: [],
      errors: [],
      warnings: [],
      stage: 'validation'
    });

    const validationResult = await validateDataPreservation();
    result.validationResult = validationResult;
    result.errors.push(...validationResult.errors);
    result.warnings.push(...validationResult.warnings);

    // Stage 6: Final verification and cleanup
    onProgress?.({ 
      currentStep: 6, 
      totalSteps: 6, 
      stepName: 'Finalization', 
      stepDescription: 'Final verification and cleanup',
      progress: 100,
      status: 'completed',
      results: [],
      errors: [],
      warnings: [],
      stage: 'finalization'
    });

    // Final success determination
    result.success = result.errors.length === 0 || options.force === true;

    // Add summary information
    result.warnings.push(`Complete migration finished: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    result.warnings.push(`Total items processed: ${result.migratedCount}, Skipped: ${result.skippedCount}`);

    if (result.inventory) {
      result.warnings.push(`Data inventory: ${result.inventory.chatSessions.count} sessions, ${result.inventory.settings.llmProviders} providers`);
    }

  } catch (error) {
    result.errors.push(`Complete migration failed: ${error}`);
    result.success = false;
  }

  return result;
}

/**
 * Validates complete migration readiness
 */
export async function validateCompleteMigrationReadiness(): Promise<{
  ready: boolean;
  issues: string[];
  recommendations: string[];
  inventory?: any;
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    // Check for existing data
    const { inventory, error } = await createUserDataInventory();
    
    if (error) {
      issues.push(`Cannot assess existing data: ${error}`);
    }

    if (!inventory) {
      recommendations.push('No existing data found - migration may not be necessary');
    } else {
      // Check data complexity
      if (inventory.chatSessions.hasToolCalls) {
        recommendations.push('Sessions contain tool calls - ensure MCP servers are properly configured');
      }

      if (inventory.settings.hasEncryptedKeys) {
        recommendations.push('Encrypted API keys detected - ensure encryption compatibility');
      }

      if (inventory.totalDataSize > 10 * 1024 * 1024) { // 10MB
        recommendations.push('Large data size detected - migration may take longer');
      }

      // Check for potential issues
      if (inventory.chatSessions.count > 1000) {
        recommendations.push('Large number of sessions - consider archiving old sessions first');
      }

      if (inventory.settings.llmProviders === 0) {
        issues.push('No LLM providers configured - application may not function after migration');
      }
    }

    // Check disk space
    const fs = require('fs').promises;
    try {
      await fs.access('data', fs.constants.W_OK);
    } catch {
      issues.push('Data directory is not writable');
    }

    // Check for conflicting files
    try {
      await fs.access('data/sessions/sessions.json');
      recommendations.push('Target sessions file already exists - will be overwritten');
    } catch {
      // File doesn't exist, which is fine
    }

    return {
      ready: issues.length === 0,
      issues,
      recommendations,
      inventory,
    };

  } catch (error) {
    return {
      ready: false,
      issues: [`Migration readiness check failed: ${error}`],
      recommendations: [],
    };
  }
}

/**
 * Creates a detailed migration report
 */
export function createMigrationReport(result: CompleteMigrationResult): string {
  const lines: string[] = [];
  
  lines.push('# MCP Chat UI Migration Report');
  lines.push('');
  lines.push(`**Date:** ${new Date().toISOString()}`);
  lines.push(`**Status:** ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push(`- **Total Items Migrated:** ${result.migratedCount}`);
  lines.push(`- **Items Skipped:** ${result.skippedCount}`);
  lines.push(`- **Errors:** ${result.errors.length}`);
  lines.push(`- **Warnings:** ${result.warnings.length}`);
  lines.push('');

  // Inventory
  if (result.inventory) {
    lines.push('## Data Inventory');
    lines.push(`- **Chat Sessions:** ${result.inventory.chatSessions.count}`);
    lines.push(`- **Total Messages:** ${result.inventory.chatSessions.totalMessages}`);
    lines.push(`- **LLM Providers:** ${result.inventory.settings.llmProviders}`);
    lines.push(`- **MCP Servers:** ${result.inventory.settings.mcpServers}`);
    lines.push(`- **Has Tool Calls:** ${result.inventory.chatSessions.hasToolCalls ? 'Yes' : 'No'}`);
    lines.push(`- **Has Encrypted Keys:** ${result.inventory.settings.hasEncryptedKeys ? 'Yes' : 'No'}`);
    lines.push(`- **Total Data Size:** ${Math.round(result.inventory.totalDataSize / 1024)} KB`);
    lines.push('');
  }

  // Preservation Results
  if (result.preservationResults) {
    lines.push('## Data Preservation Results');
    Object.entries(result.preservationResults).forEach(([key, pr]) => {
      lines.push(`### ${key.charAt(0).toUpperCase() + key.slice(1)}`);
      lines.push(`- **Status:** ${pr.success ? '✅ Success' : '❌ Failed'}`);
      lines.push(`- **Migrated:** ${pr.migratedCount}`);
      lines.push(`- **Skipped:** ${pr.skippedCount}`);
      if (pr.errors.length > 0) {
        lines.push(`- **Errors:** ${pr.errors.join(', ')}`);
      }
      lines.push('');
    });
  }

  // Errors
  if (result.errors.length > 0) {
    lines.push('## Errors');
    result.errors.forEach(error => {
      lines.push(`- ${error}`);
    });
    lines.push('');
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push('## Warnings');
    result.warnings.forEach(warning => {
      lines.push(`- ${warning}`);
    });
    lines.push('');
  }

  // Recommendations
  lines.push('## Next Steps');
  if (result.success) {
    lines.push('- ✅ Migration completed successfully');
    lines.push('- 🔍 Verify that all data is accessible in the new format');
    lines.push('- 🧹 Consider cleaning up old data files after verification');
    lines.push('- 🔄 Test all functionality with migrated data');
  } else {
    lines.push('- ❌ Migration failed - review errors above');
    lines.push('- 🔄 Consider restoring from backup if available');
    lines.push('- 🛠️ Fix identified issues and retry migration');
    lines.push('- 📞 Contact support if issues persist');
  }

  return lines.join('\n');
}