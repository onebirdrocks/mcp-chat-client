// Backup and rollback utilities for migration

import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { BackupData, MigrationMetadata, MigrationResult } from './types';

/**
 * Creates a backup of existing data before migration
 */
export async function createBackup(
  sourceData: any,
  metadata: MigrationMetadata
): Promise<{ success: boolean; backupPath?: string; error?: string }> {
  try {
    const backupDir = join('data', 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `migration-backup-${timestamp}.json`);

    // Create checksums for data integrity
    const checksums: Record<string, string> = {};
    if (sourceData.sessions) {
      checksums.sessions = createHash('sha256')
        .update(JSON.stringify(sourceData.sessions))
        .digest('hex');
    }
    if (sourceData.settings) {
      checksums.settings = createHash('sha256')
        .update(JSON.stringify(sourceData.settings))
        .digest('hex');
    }

    const backupData: BackupData = {
      metadata,
      originalData: sourceData,
      checksums,
    };

    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

    return { success: true, backupPath };
  } catch (error) {
    return { success: false, error: `Failed to create backup: ${error}` };
  }
}

/**
 * Restores data from a backup file
 */
export async function restoreFromBackup(
  backupPath: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    skippedCount: 0,
    errors: [],
    warnings: [],
  };

  try {
    // Read backup file
    const backupContent = await fs.readFile(backupPath, 'utf-8');
    const backupData: BackupData = JSON.parse(backupContent);

    // Validate backup integrity
    const integrityCheck = await validateBackupIntegrity(backupData);
    if (!integrityCheck.valid) {
      result.errors.push(...integrityCheck.errors);
      return result;
    }

    // Restore sessions data
    if (backupData.originalData.sessions) {
      const sessionsPath = join('data', 'sessions', 'sessions.json');
      await fs.writeFile(
        sessionsPath,
        JSON.stringify(backupData.originalData.sessions, null, 2)
      );
      result.migratedCount++;
    }

    // Restore settings data
    if (backupData.originalData.settings) {
      const settingsPath = join('data', 'settings', 'settings.json');
      await fs.writeFile(
        settingsPath,
        JSON.stringify(backupData.originalData.settings, null, 2)
      );
      result.migratedCount++;
    }

    result.success = true;
    return result;
  } catch (error) {
    result.errors.push(`Failed to restore from backup: ${error}`);
    return result;
  }
}

/**
 * Validates backup file integrity
 */
async function validateBackupIntegrity(
  backupData: BackupData
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Check required fields
  if (!backupData.metadata) {
    errors.push('Backup metadata is missing');
  }
  if (!backupData.originalData) {
    errors.push('Backup original data is missing');
  }
  if (!backupData.checksums) {
    errors.push('Backup checksums are missing');
  }

  // Validate checksums
  if (backupData.originalData.sessions && backupData.checksums.sessions) {
    const actualChecksum = createHash('sha256')
      .update(JSON.stringify(backupData.originalData.sessions))
      .digest('hex');
    if (actualChecksum !== backupData.checksums.sessions) {
      errors.push('Sessions data checksum mismatch');
    }
  }

  if (backupData.originalData.settings && backupData.checksums.settings) {
    const actualChecksum = createHash('sha256')
      .update(JSON.stringify(backupData.originalData.settings))
      .digest('hex');
    if (actualChecksum !== backupData.checksums.settings) {
      errors.push('Settings data checksum mismatch');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Lists available backup files
 */
export async function listBackups(): Promise<{
  backups: Array<{
    path: string;
    timestamp: string;
    metadata?: MigrationMetadata;
    size: number;
  }>;
  error?: string;
}> {
  try {
    const backupDir = join('data', 'backups');
    
    try {
      await fs.access(backupDir);
    } catch {
      return { backups: [] };
    }

    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(file => 
      file.startsWith('migration-backup-') && file.endsWith('.json')
    );

    const backups = await Promise.all(
      backupFiles.map(async (file) => {
        const filePath = join(backupDir, file);
        const stats = await fs.stat(filePath);
        
        let metadata: MigrationMetadata | undefined;
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const backupData: BackupData = JSON.parse(content);
          metadata = backupData.metadata;
        } catch {
          // Ignore metadata read errors
        }

        return {
          path: filePath,
          timestamp: file.replace('migration-backup-', '').replace('.json', ''),
          metadata,
          size: stats.size,
        };
      })
    );

    // Sort by timestamp (newest first)
    backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return { backups };
  } catch (error) {
    return { backups: [], error: `Failed to list backups: ${error}` };
  }
}

/**
 * Cleans up old backup files
 */
export async function cleanupOldBackups(
  keepCount: number = 5
): Promise<{ deletedCount: number; error?: string }> {
  try {
    const { backups, error } = await listBackups();
    if (error) {
      return { deletedCount: 0, error };
    }

    if (backups.length <= keepCount) {
      return { deletedCount: 0 };
    }

    const backupsToDelete = backups.slice(keepCount);
    let deletedCount = 0;

    for (const backup of backupsToDelete) {
      try {
        await fs.unlink(backup.path);
        deletedCount++;
      } catch (error) {
        console.warn(`Failed to delete backup ${backup.path}: ${error}`);
      }
    }

    return { deletedCount };
  } catch (error) {
    return { deletedCount: 0, error: `Failed to cleanup backups: ${error}` };
  }
}

/**
 * Estimates backup size before creating it
 */
export function estimateBackupSize(data: any): number {
  try {
    return Buffer.byteLength(JSON.stringify(data, null, 2), 'utf8');
  } catch {
    return 0;
  }
}

/**
 * Verifies that there's enough disk space for backup
 */
export async function checkDiskSpace(requiredBytes: number): Promise<{
  hasSpace: boolean;
  availableBytes?: number;
  error?: string;
}> {
  try {
    const { execSync } = require('child_process');
    
    // Get disk usage for the data directory
    const output = execSync('df -B1 data', { encoding: 'utf8' });
    const lines = output.trim().split('\n');
    const dataLine = lines[1];
    const columns = dataLine.split(/\s+/);
    const availableBytes = parseInt(columns[3]);

    return {
      hasSpace: availableBytes >= requiredBytes,
      availableBytes,
    };
  } catch (error) {
    // Fallback: assume we have space if we can't check
    return { hasSpace: true, error: `Could not check disk space: ${error}` };
  }
}