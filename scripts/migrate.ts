#!/usr/bin/env tsx
// Migration CLI script

import { Command } from 'commander';
import { 
  runMigration, 
  validateMigration, 
  createMigrationPlan,
  backupUtils,
  runCompleteMigration,
  validateCompleteMigrationReadiness,
  createMigrationReport,
  createUserDataInventory,
  MigrationOptions,
  MigrationProgress,
  CompleteMigrationOptions
} from '../lib/migration';

const program = new Command();

program
  .name('migrate')
  .description('MCP Chat UI data migration utility')
  .version('1.0.0');

// Complete migration command (recommended)
program
  .command('complete')
  .description('Run complete migration with comprehensive data preservation')
  .option('--dry-run', 'Perform a dry run without making changes')
  .option('--no-backup', 'Skip creating backup (not recommended)')
  .option('--force', 'Continue migration even if validation fails')
  .option('--no-rollback', 'Disable automatic rollback on error')
  .option('--skip-preservation', 'Skip data preservation steps')
  .option('--no-inventory', 'Skip creating data inventory')
  .option('--report <path>', 'Save migration report to file')
  .action(async (options) => {
    console.log('🚀 Starting Complete MCP Chat UI Migration...\n');

    const migrationOptions: CompleteMigrationOptions = {
      dryRun: options.dryRun || false,
      createBackup: options.backup !== false,
      force: options.force || false,
      rollbackOnError: options.rollback !== false,
      skipDataPreservation: options.skipPreservation || false,
      generateInventory: options.inventory !== false,
    };

    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    const startTime = Date.now();

    try {
      const result = await runCompleteMigration(migrationOptions, (progress) => {
        const percentage = Math.round(progress.progress);
        console.log(`[${percentage}%] ${progress.stage.toUpperCase()}: ${progress.stepName}`);
        console.log(`    ${progress.stepDescription}`);
      });

      const duration = Date.now() - startTime;

      console.log('\n📊 Complete Migration Results:');
      console.log(`✅ Success: ${result.success}`);
      console.log(`📦 Total Migrated: ${result.migratedCount} items`);
      console.log(`⏭️  Total Skipped: ${result.skippedCount} items`);
      console.log(`⏱️  Duration: ${Math.round(duration / 1000)}s`);

      if (result.inventory) {
        console.log('\n📋 Data Inventory:');
        console.log(`  Sessions: ${result.inventory.chatSessions.count} (${result.inventory.chatSessions.totalMessages} messages)`);
        console.log(`  Providers: ${result.inventory.settings.llmProviders}`);
        console.log(`  MCP Servers: ${result.inventory.settings.mcpServers}`);
        console.log(`  Data Size: ${Math.round(result.inventory.totalDataSize / 1024)} KB`);
      }

      if (result.preservationResults) {
        console.log('\n🛡️  Data Preservation:');
        Object.entries(result.preservationResults).forEach(([key, pr]) => {
          const status = pr.success ? '✅' : '❌';
          console.log(`  ${key}: ${status} (${pr.migratedCount} items)`);
        });
      }

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(warning => console.log(`  - ${warning}`));
      }

      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }

      // Generate and save report if requested
      if (options.report) {
        const report = createMigrationReport(result);
        const fs = require('fs').promises;
        await fs.writeFile(options.report, report);
        console.log(`\n📄 Migration report saved to: ${options.report}`);
      }

      if (!result.success) {
        process.exit(1);
      }

      console.log('\n🎉 Complete migration finished successfully!');
    } catch (error) {
      console.error('\n💥 Complete migration failed:', error);
      process.exit(1);
    }
  });

// Basic migration command
program
  .command('run')
  .description('Run basic migration process (use "complete" for full migration)')
  .option('--dry-run', 'Perform a dry run without making changes')
  .option('--no-backup', 'Skip creating backup (not recommended)')
  .option('--force', 'Continue migration even if validation fails')
  .option('--no-rollback', 'Disable automatic rollback on error')
  .action(async (options) => {
    console.log('🚀 Starting MCP Chat UI Migration...\n');

    const migrationOptions: MigrationOptions = {
      dryRun: options.dryRun || false,
      createBackup: options.backup !== false,
      force: options.force || false,
      rollbackOnError: options.rollback !== false,
    };

    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    const startTime = Date.now();

    try {
      const result = await runMigration(migrationOptions, (progress: MigrationProgress) => {
        const percentage = Math.round(progress.progress);
        console.log(`[${percentage}%] ${progress.stepName}: ${progress.stepDescription}`);
      });

      const duration = Date.now() - startTime;

      console.log('\n📊 Migration Results:');
      console.log(`✅ Success: ${result.success}`);
      console.log(`📦 Migrated: ${result.migratedCount} items`);
      console.log(`⏭️  Skipped: ${result.skippedCount} items`);
      console.log(`⏱️  Duration: ${duration}ms`);

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(warning => console.log(`  - ${warning}`));
      }

      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach(error => console.log(`  - ${error}`));
        process.exit(1);
      }

      console.log('\n🎉 Migration completed successfully!');
    } catch (error) {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    }
  });

// Validation command
program
  .command('validate')
  .description('Validate migration without executing it')
  .action(async () => {
    console.log('🔍 Validating migration...\n');

    try {
      const result = await validateMigration();

      console.log('📊 Validation Results:');
      console.log(`✅ Valid: ${result.success}`);
      console.log(`📦 Would migrate: ${result.migratedCount} items`);
      console.log(`⏭️  Would skip: ${result.skippedCount} items`);

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(warning => console.log(`  - ${warning}`));
      }

      if (result.errors.length > 0) {
        console.log('\n❌ Validation Errors:');
        result.errors.forEach(error => console.log(`  - ${error}`));
        process.exit(1);
      }

      console.log('\n✅ Migration validation passed!');
    } catch (error) {
      console.error('\n💥 Validation failed:', error);
      process.exit(1);
    }
  });

// Plan command
program
  .command('plan')
  .description('Show migration plan without executing')
  .action(async () => {
    console.log('📋 Creating migration plan...\n');

    try {
      const plan = await createMigrationPlan();

      console.log('📊 Migration Plan:');
      console.log(`📦 Total steps: ${plan.totalSteps}`);
      console.log(`⏱️  Estimated duration: ${Math.round(plan.estimatedDuration / 1000)}s`);
      console.log(`💾 Required backup space: ${Math.round(plan.requiredBackupSpace / 1024)}KB`);

      console.log('\n📝 Steps:');
      plan.steps.forEach((step, index) => {
        const required = step.required ? '(required)' : '(optional)';
        console.log(`  ${index + 1}. ${step.name} ${required}`);
        console.log(`     ${step.description}`);
      });

    } catch (error) {
      console.error('\n💥 Plan creation failed:', error);
      process.exit(1);
    }
  });

// Backup management commands
const backupCmd = program
  .command('backup')
  .description('Backup management commands');

backupCmd
  .command('list')
  .description('List available backups')
  .action(async () => {
    console.log('📋 Available backups:\n');

    try {
      const { backups, error } = await backupUtils.list();
      
      if (error) {
        console.error('❌ Error listing backups:', error);
        process.exit(1);
      }

      if (backups.length === 0) {
        console.log('No backups found.');
        return;
      }

      backups.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.timestamp}`);
        console.log(`   Path: ${backup.path}`);
        console.log(`   Size: ${Math.round(backup.size / 1024)}KB`);
        if (backup.metadata) {
          console.log(`   Components: ${backup.metadata.migratedComponents.join(', ')}`);
        }
        console.log('');
      });

    } catch (error) {
      console.error('💥 Failed to list backups:', error);
      process.exit(1);
    }
  });

backupCmd
  .command('restore <backupPath>')
  .description('Restore from a backup file')
  .action(async (backupPath: string) => {
    console.log(`🔄 Restoring from backup: ${backupPath}\n`);

    try {
      const result = await backupUtils.restore(backupPath);

      console.log('📊 Restore Results:');
      console.log(`✅ Success: ${result.success}`);
      console.log(`📦 Restored: ${result.migratedCount} items`);

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(warning => console.log(`  - ${warning}`));
      }

      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach(error => console.log(`  - ${error}`));
        process.exit(1);
      }

      console.log('\n🎉 Restore completed successfully!');
    } catch (error) {
      console.error('\n💥 Restore failed:', error);
      process.exit(1);
    }
  });

backupCmd
  .command('cleanup')
  .description('Clean up old backup files')
  .option('--keep <count>', 'Number of backups to keep', '5')
  .action(async (options) => {
    const keepCount = parseInt(options.keep);
    console.log(`🧹 Cleaning up old backups (keeping ${keepCount})...\n`);

    try {
      const { deletedCount, error } = await backupUtils.cleanup(keepCount);
      
      if (error) {
        console.error('❌ Cleanup error:', error);
        process.exit(1);
      }

      console.log(`✅ Deleted ${deletedCount} old backup files`);
    } catch (error) {
      console.error('💥 Cleanup failed:', error);
      process.exit(1);
    }
  });

// Data analysis commands
const dataCmd = program
  .command('data')
  .description('Data analysis and inventory commands');

dataCmd
  .command('inventory')
  .description('Create inventory of existing user data')
  .action(async () => {
    console.log('📋 Creating user data inventory...\n');

    try {
      const { inventory, error } = await createUserDataInventory();
      
      if (error) {
        console.error('❌ Error creating inventory:', error);
        process.exit(1);
      }

      if (!inventory) {
        console.log('No user data found.');
        return;
      }

      console.log('📊 User Data Inventory:');
      console.log('\n💬 Chat Sessions:');
      console.log(`  Count: ${inventory.chatSessions.count}`);
      console.log(`  Total Messages: ${inventory.chatSessions.totalMessages}`);
      console.log(`  Date Range: ${inventory.chatSessions.dateRange.earliest} to ${inventory.chatSessions.dateRange.latest}`);
      console.log(`  Providers: ${inventory.chatSessions.providers.join(', ') || 'None'}`);
      console.log(`  Models: ${inventory.chatSessions.models.join(', ') || 'None'}`);
      console.log(`  Has Tool Calls: ${inventory.chatSessions.hasToolCalls ? 'Yes' : 'No'}`);

      console.log('\n⚙️  Settings:');
      console.log(`  LLM Providers: ${inventory.settings.llmProviders}`);
      console.log(`  MCP Servers: ${inventory.settings.mcpServers}`);
      console.log(`  Has Encrypted Keys: ${inventory.settings.hasEncryptedKeys ? 'Yes' : 'No'}`);
      console.log(`  Preferences: ${inventory.settings.preferences.join(', ') || 'None'}`);

      console.log('\n📏 Summary:');
      console.log(`  Total Data Size: ${Math.round(inventory.totalDataSize / 1024)} KB`);
      console.log(`  Last Modified: ${inventory.lastModified}`);

    } catch (error) {
      console.error('💥 Inventory creation failed:', error);
      process.exit(1);
    }
  });

dataCmd
  .command('readiness')
  .description('Check migration readiness')
  .action(async () => {
    console.log('🔍 Checking migration readiness...\n');

    try {
      const readiness = await validateCompleteMigrationReadiness();

      console.log('📊 Migration Readiness Report:');
      console.log(`✅ Ready: ${readiness.ready ? 'Yes' : 'No'}`);

      if (readiness.issues.length > 0) {
        console.log('\n❌ Issues:');
        readiness.issues.forEach(issue => console.log(`  - ${issue}`));
      }

      if (readiness.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        readiness.recommendations.forEach(rec => console.log(`  - ${rec}`));
      }

      if (readiness.inventory) {
        console.log('\n📋 Data Summary:');
        console.log(`  Sessions: ${readiness.inventory.chatSessions.count}`);
        console.log(`  Providers: ${readiness.inventory.settings.llmProviders}`);
        console.log(`  Data Size: ${Math.round(readiness.inventory.totalDataSize / 1024)} KB`);
      }

      if (!readiness.ready) {
        console.log('\n⚠️  Migration is not ready. Please address the issues above.');
        process.exit(1);
      }

      console.log('\n✅ Migration is ready to proceed!');
    } catch (error) {
      console.error('💥 Readiness check failed:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();