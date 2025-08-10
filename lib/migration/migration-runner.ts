// Main migration runner and orchestrator

import { 
  MigrationStep, 
  MigrationOptions, 
  MigrationResult, 
  MigrationPlan,
  MigrationMetadata 
} from './types';
import { migrationSteps } from './migration-steps';
import { createBackup, restoreFromBackup, listBackups, cleanupOldBackups } from './backup';

export interface MigrationProgress {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  stepDescription: string;
  progress: number; // 0-100
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results: MigrationResult[];
  errors: string[];
  warnings: string[];
}

export class MigrationRunner {
  private steps: MigrationStep[];
  private options: MigrationOptions;
  private progress: MigrationProgress;
  private cancelled: boolean = false;

  constructor(steps: MigrationStep[] = migrationSteps, options: MigrationOptions = {}) {
    this.steps = steps;
    this.options = {
      dryRun: false,
      createBackup: true,
      validateOnly: false,
      force: false,
      rollbackOnError: true,
      ...options,
    };
    
    this.progress = {
      currentStep: 0,
      totalSteps: steps.length,
      stepName: '',
      stepDescription: '',
      progress: 0,
      status: 'running',
      results: [],
      errors: [],
      warnings: [],
    };
  }

  /**
   * Creates a migration plan without executing it
   */
  async createPlan(): Promise<MigrationPlan> {
    const plan: MigrationPlan = {
      steps: this.steps,
      totalSteps: this.steps.length,
      estimatedDuration: this.estimateDuration(),
      requiredBackupSpace: await this.estimateBackupSpace(),
    };

    return plan;
  }

  /**
   * Executes the migration with progress tracking
   */
  async execute(
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    const overallResult: MigrationResult = {
      success: false,
      migratedCount: 0,
      skippedCount: 0,
      errors: [],
      warnings: [],
    };

    this.progress.status = 'running';
    this.cancelled = false;

    try {
      for (let i = 0; i < this.steps.length; i++) {
        if (this.cancelled) {
          this.progress.status = 'cancelled';
          overallResult.errors.push('Migration cancelled by user');
          break;
        }

        const step = this.steps[i];
        this.progress.currentStep = i + 1;
        this.progress.stepName = step.name;
        this.progress.stepDescription = step.description;
        this.progress.progress = (i / this.steps.length) * 100;

        if (onProgress) {
          onProgress({ ...this.progress });
        }

        console.log(`Executing migration step ${i + 1}/${this.steps.length}: ${step.name}`);

        try {
          const stepResult = await step.execute(this.options);
          this.progress.results.push(stepResult);

          // Accumulate results
          overallResult.migratedCount += stepResult.migratedCount;
          overallResult.skippedCount += stepResult.skippedCount;
          overallResult.errors.push(...stepResult.errors);
          overallResult.warnings.push(...stepResult.warnings);

          if (!stepResult.success) {
            if (step.required && !this.options.force) {
              overallResult.errors.push(`Required step '${step.name}' failed`);
              
              if (this.options.rollbackOnError) {
                await this.rollback();
              }
              
              this.progress.status = 'failed';
              return overallResult;
            } else {
              overallResult.warnings.push(`Optional step '${step.name}' failed but continuing`);
            }
          }

        } catch (error) {
          const errorMsg = `Step '${step.name}' threw exception: ${error}`;
          overallResult.errors.push(errorMsg);
          this.progress.errors.push(errorMsg);

          if (step.required && !this.options.force) {
            if (this.options.rollbackOnError) {
              await this.rollback();
            }
            
            this.progress.status = 'failed';
            return overallResult;
          }
        }
      }

      this.progress.progress = 100;
      this.progress.status = this.cancelled ? 'cancelled' : 'completed';
      overallResult.success = overallResult.errors.length === 0 || this.options.force;

      // Final progress update
      if (onProgress) {
        onProgress({ ...this.progress });
      }

      console.log(`Migration completed. Success: ${overallResult.success}, Migrated: ${overallResult.migratedCount}, Errors: ${overallResult.errors.length}`);

    } catch (error) {
      overallResult.errors.push(`Migration runner failed: ${error}`);
      this.progress.status = 'failed';
      this.progress.errors.push(`Migration runner failed: ${error}`);
    }

    return overallResult;
  }

  /**
   * Cancels the migration
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Gets current progress
   */
  getProgress(): MigrationProgress {
    return { ...this.progress };
  }

  /**
   * Performs rollback of completed steps
   */
  async rollback(): Promise<MigrationResult> {
    const rollbackResult: MigrationResult = {
      success: false,
      migratedCount: 0,
      skippedCount: 0,
      errors: [],
      warnings: [],
    };

    console.log('Starting migration rollback...');

    // Rollback steps in reverse order
    const completedSteps = this.progress.results
      .map((result, index) => ({ result, step: this.steps[index] }))
      .filter(({ result }) => result.success)
      .reverse();

    for (const { result, step } of completedSteps) {
      if (step.rollback) {
        try {
          console.log(`Rolling back step: ${step.name}`);
          const stepRollback = await step.rollback(result.rollbackData);
          rollbackResult.migratedCount += stepRollback.migratedCount;
          rollbackResult.errors.push(...stepRollback.errors);
          rollbackResult.warnings.push(...stepRollback.warnings);
        } catch (error) {
          rollbackResult.errors.push(`Rollback failed for step '${step.name}': ${error}`);
        }
      }
    }

    rollbackResult.success = rollbackResult.errors.length === 0;
    console.log(`Rollback completed. Success: ${rollbackResult.success}`);

    return rollbackResult;
  }

  /**
   * Validates migration without executing it
   */
  async validate(): Promise<MigrationResult> {
    const validationOptions = { ...this.options, validateOnly: true, dryRun: true };
    const runner = new MigrationRunner(this.steps, validationOptions);
    return await runner.execute();
  }

  /**
   * Estimates migration duration in milliseconds
   */
  private estimateDuration(): number {
    // Rough estimates based on step complexity
    const stepDurations = {
      'validate-environment': 1000,
      'create-backup': 5000,
      'migrate-chat-history': 10000,
      'migrate-settings': 3000,
      'validate-migrated-data': 2000,
    };

    return this.steps.reduce((total, step) => {
      return total + (stepDurations[step.id as keyof typeof stepDurations] || 5000);
    }, 0);
  }

  /**
   * Estimates required backup space in bytes
   */
  private async estimateBackupSpace(): Promise<number> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      let totalSize = 0;
      
      const pathsToCheck = [
        'data/sessions',
        'data/settings',
        'backend/data/sessions',
        'backend/data/settings',
      ];

      for (const dirPath of pathsToCheck) {
        try {
          const files = await fs.readdir(dirPath);
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
              totalSize += stats.size;
            }
          }
        } catch {
          // Directory doesn't exist, skip
        }
      }

      // Add 50% buffer for backup metadata and compression
      return Math.ceil(totalSize * 1.5);
    } catch {
      return 10 * 1024 * 1024; // Default 10MB estimate
    }
  }
}

/**
 * Convenience function to run migration with default settings
 */
export async function runMigration(
  options: MigrationOptions = {},
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationResult> {
  const runner = new MigrationRunner(migrationSteps, options);
  return await runner.execute(onProgress);
}

/**
 * Convenience function to validate migration without executing
 */
export async function validateMigration(
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const runner = new MigrationRunner(migrationSteps, options);
  return await runner.validate();
}

/**
 * Convenience function to create migration plan
 */
export async function createMigrationPlan(): Promise<MigrationPlan> {
  const runner = new MigrationRunner();
  return await runner.createPlan();
}

/**
 * Utility functions for backup management
 */
export const backupUtils = {
  list: listBackups,
  restore: restoreFromBackup,
  cleanup: cleanupOldBackups,
};