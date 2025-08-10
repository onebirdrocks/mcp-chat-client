import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { EncryptionService, EncryptedData } from './encryption';

export interface StorageMetadata {
  version: string;
  createdAt: string;
  updatedAt: string;
  hash: string;
  encrypted: boolean;
}

export interface SecureStorageOptions {
  baseDir: string;
  encryptionEnabled: boolean;
  backupEnabled: boolean;
  maxBackups: number;
  compressionEnabled: boolean;
}

export interface StoredData<T = any> {
  data: T;
  metadata: StorageMetadata;
}

export class SecureStorage {
  private encryption: EncryptionService;
  private options: SecureStorageOptions;

  constructor(
    encryption: EncryptionService,
    options: Partial<SecureStorageOptions> = {}
  ) {
    this.encryption = encryption;
    this.options = {
      baseDir: process.cwd() + '/data',
      encryptionEnabled: true,
      backupEnabled: true,
      maxBackups: 5,
      compressionEnabled: false,
      ...options,
    };
  }

  /**
   * Ensure directory exists
   */
  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Get full file path
   */
  private getFilePath(key: string): string {
    return join(this.options.baseDir, `${key}.json`);
  }

  /**
   * Get backup file path
   */
  private getBackupPath(key: string, timestamp: string): string {
    const backupDir = join(this.options.baseDir, 'backups');
    return join(backupDir, `${key}_${timestamp}.json`);
  }

  /**
   * Create backup of existing file
   */
  private async createBackup(key: string): Promise<void> {
    if (!this.options.backupEnabled) return;

    const filePath = this.getFilePath(key);
    try {
      await fs.access(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = this.getBackupPath(key, timestamp);
      
      await this.ensureDir(dirname(backupPath));
      await fs.copyFile(filePath, backupPath);
      
      // Clean up old backups
      await this.cleanupOldBackups(key);
    } catch {
      // File doesn't exist, no backup needed
    }
  }

  /**
   * Clean up old backup files
   */
  private async cleanupOldBackups(key: string): Promise<void> {
    const backupDir = join(this.options.baseDir, 'backups');
    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = files
        .filter(file => file.startsWith(`${key}_`) && file.endsWith('.json'))
        .sort()
        .reverse();

      if (backupFiles.length > this.options.maxBackups) {
        const filesToDelete = backupFiles.slice(this.options.maxBackups);
        for (const file of filesToDelete) {
          await fs.unlink(join(backupDir, file));
        }
      }
    } catch {
      // Backup directory doesn't exist or other error, ignore
    }
  }

  /**
   * Store data securely
   */
  async store<T>(key: string, data: T, password?: string): Promise<void> {
    if (!key) {
      throw new Error('Storage key cannot be empty');
    }

    await this.ensureDir(this.options.baseDir);
    await this.createBackup(key);

    const now = new Date().toISOString();
    const serializedData = JSON.stringify(data, null, 2);
    const hash = this.encryption.generateHash(serializedData);

    let finalData: string | EncryptedData = serializedData;
    let encrypted = false;

    if (this.options.encryptionEnabled && (password || this.encryption)) {
      finalData = await this.encryption.encrypt(serializedData, password);
      encrypted = true;
    }

    const storedData: StoredData = {
      data: finalData,
      metadata: {
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
        hash,
        encrypted,
      },
    };

    const filePath = this.getFilePath(key);
    await fs.writeFile(filePath, JSON.stringify(storedData, null, 2), 'utf8');
  }

  /**
   * Retrieve data securely
   */
  async retrieve<T>(key: string, password?: string): Promise<T | null> {
    if (!key) {
      throw new Error('Storage key cannot be empty');
    }

    const filePath = this.getFilePath(key);
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const storedData: StoredData = JSON.parse(fileContent);

      let rawData: string;
      
      if (storedData.metadata.encrypted) {
        if (!password && !this.encryption) {
          throw new Error('Password required to decrypt data');
        }
        rawData = await this.encryption.decrypt(storedData.data as EncryptedData, password);
      } else {
        rawData = storedData.data as string;
      }

      // Verify data integrity
      if (!this.encryption.verifyHash(rawData, storedData.metadata.hash)) {
        throw new Error('Data integrity check failed');
      }

      return JSON.parse(rawData);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw error;
    }
  }

  /**
   * Check if data exists
   */
  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete stored data
   */
  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * List all stored keys
   */
  async listKeys(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.options.baseDir);
      return files
        .filter(file => file.endsWith('.json') && !file.startsWith('.'))
        .map(file => file.replace('.json', ''));
    } catch {
      return [];
    }
  }

  /**
   * Get storage metadata
   */
  async getMetadata(key: string): Promise<StorageMetadata | null> {
    const filePath = this.getFilePath(key);
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const storedData: StoredData = JSON.parse(fileContent);
      return storedData.metadata;
    } catch {
      return null;
    }
  }

  /**
   * Update metadata without changing data
   */
  async updateMetadata(key: string, metadata: Partial<StorageMetadata>): Promise<void> {
    const filePath = this.getFilePath(key);
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const storedData: StoredData = JSON.parse(fileContent);
      
      storedData.metadata = {
        ...storedData.metadata,
        ...metadata,
        updatedAt: new Date().toISOString(),
      };
      
      await fs.writeFile(filePath, JSON.stringify(storedData, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to update metadata for key ${key}: ${error}`);
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(key: string, timestamp: string, password?: string): Promise<void> {
    const backupPath = this.getBackupPath(key, timestamp);
    const filePath = this.getFilePath(key);
    
    try {
      await fs.copyFile(backupPath, filePath);
    } catch (error) {
      throw new Error(`Failed to restore backup for key ${key}: ${error}`);
    }
  }

  /**
   * List available backups for a key
   */
  async listBackups(key: string): Promise<string[]> {
    const backupDir = join(this.options.baseDir, 'backups');
    try {
      const files = await fs.readdir(backupDir);
      return files
        .filter(file => file.startsWith(`${key}_`) && file.endsWith('.json'))
        .map(file => file.replace(`${key}_`, '').replace('.json', ''))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  /**
   * Clean up all data (for privacy/security)
   */
  async cleanup(): Promise<void> {
    try {
      const keys = await this.listKeys();
      for (const key of keys) {
        await this.delete(key);
      }
      
      // Clean up backups
      const backupDir = join(this.options.baseDir, 'backups');
      try {
        await fs.rmdir(backupDir, { recursive: true });
      } catch {
        // Ignore if backup directory doesn't exist
      }
    } catch (error) {
      throw new Error(`Failed to cleanup storage: ${error}`);
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    totalSize: number;
    encryptedKeys: number;
    lastBackup?: string;
  }> {
    const keys = await this.listKeys();
    let totalSize = 0;
    let encryptedKeys = 0;
    let lastBackup: string | undefined;

    for (const key of keys) {
      const filePath = this.getFilePath(key);
      try {
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        
        const metadata = await this.getMetadata(key);
        if (metadata?.encrypted) {
          encryptedKeys++;
        }
      } catch {
        // Ignore errors for individual files
      }
    }

    // Check for latest backup
    const backupDir = join(this.options.baseDir, 'backups');
    try {
      const backupFiles = await fs.readdir(backupDir);
      if (backupFiles.length > 0) {
        const sortedBackups = backupFiles.sort().reverse();
        lastBackup = sortedBackups[0];
      }
    } catch {
      // No backups directory
    }

    return {
      totalKeys: keys.length,
      totalSize,
      encryptedKeys,
      lastBackup,
    };
  }
}