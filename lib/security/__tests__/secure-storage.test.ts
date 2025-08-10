import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { SecureStorage } from '../secure-storage';
import { EncryptionService } from '../encryption';

describe('SecureStorage', () => {
  let storage: SecureStorage;
  let encryption: EncryptionService;
  const testDir = join(process.cwd(), 'test-storage');
  const testPassword = 'test-password-123';

  beforeEach(async () => {
    encryption = new EncryptionService();
    await encryption.initialize(testPassword);
    
    storage = new SecureStorage(encryption, {
      baseDir: testDir,
      encryptionEnabled: true,
      backupEnabled: true,
      maxBackups: 3,
    });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rmdir(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
    encryption.clearSensitiveData();
  });

  describe('basic storage operations', () => {
    it('should store and retrieve data', async () => {
      const testData = { message: 'Hello, World!', number: 42 };
      
      await storage.store('test-key', testData, testPassword);
      const retrieved = await storage.retrieve('test-key', testPassword);
      
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await storage.retrieve('non-existent-key', testPassword);
      expect(result).toBeNull();
    });

    it('should check if data exists', async () => {
      const testData = { test: true };
      
      expect(await storage.exists('test-key')).toBe(false);
      
      await storage.store('test-key', testData, testPassword);
      expect(await storage.exists('test-key')).toBe(true);
    });

    it('should delete stored data', async () => {
      const testData = { test: true };
      
      await storage.store('test-key', testData, testPassword);
      expect(await storage.exists('test-key')).toBe(true);
      
      await storage.delete('test-key');
      expect(await storage.exists('test-key')).toBe(false);
    });

    it('should list stored keys', async () => {
      await storage.store('key1', { data: 1 }, testPassword);
      await storage.store('key2', { data: 2 }, testPassword);
      await storage.store('key3', { data: 3 }, testPassword);
      
      const keys = await storage.listKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
      expect(keys.length).toBe(3);
    });
  });

  describe('encryption and security', () => {
    it('should store data encrypted', async () => {
      const testData = { secret: 'sensitive-information' };
      
      await storage.store('encrypted-key', testData, testPassword);
      
      // Read raw file to verify it's encrypted
      const filePath = join(testDir, 'encrypted-key.json');
      const rawContent = await fs.readFile(filePath, 'utf8');
      const storedData = JSON.parse(rawContent);
      
      expect(storedData.metadata.encrypted).toBe(true);
      expect(typeof storedData.data).toBe('object');
      expect(storedData.data.encrypted).toBeDefined();
      expect(storedData.data.iv).toBeDefined();
      expect(storedData.data.tag).toBeDefined();
    });

    it('should fail to decrypt with wrong password', async () => {
      const testData = { secret: 'sensitive-information' };
      
      await storage.store('encrypted-key', testData, testPassword);
      
      await expect(storage.retrieve('encrypted-key', 'wrong-password')).rejects.toThrow();
    });

    it('should verify data integrity', async () => {
      const testData = { important: 'data' };
      
      await storage.store('integrity-key', testData, testPassword);
      
      // Manually corrupt the file
      const filePath = join(testDir, 'integrity-key.json');
      const rawContent = await fs.readFile(filePath, 'utf8');
      const storedData = JSON.parse(rawContent);
      storedData.metadata.hash = 'corrupted-hash';
      await fs.writeFile(filePath, JSON.stringify(storedData));
      
      await expect(storage.retrieve('integrity-key', testPassword)).rejects.toThrow('Data integrity check failed');
    });
  });

  describe('metadata operations', () => {
    it('should store and retrieve metadata', async () => {
      const testData = { test: 'data' };
      
      await storage.store('meta-key', testData, testPassword);
      const metadata = await storage.getMetadata('meta-key');
      
      expect(metadata).toBeDefined();
      expect(metadata!.version).toBe('1.0.0');
      expect(metadata!.encrypted).toBe(true);
      expect(metadata!.createdAt).toBeDefined();
      expect(metadata!.updatedAt).toBeDefined();
      expect(metadata!.hash).toBeDefined();
    });

    it('should update metadata', async () => {
      const testData = { test: 'data' };
      
      await storage.store('meta-key', testData, testPassword);
      const originalMetadata = await storage.getMetadata('meta-key');
      
      await storage.updateMetadata('meta-key', { version: '2.0.0' });
      const updatedMetadata = await storage.getMetadata('meta-key');
      
      expect(updatedMetadata!.version).toBe('2.0.0');
      expect(updatedMetadata!.updatedAt).not.toBe(originalMetadata!.updatedAt);
    });

    it('should return null metadata for non-existent keys', async () => {
      const metadata = await storage.getMetadata('non-existent');
      expect(metadata).toBeNull();
    });
  });

  describe('backup functionality', () => {
    it('should create backups when enabled', async () => {
      const testData1 = { version: 1 };
      const testData2 = { version: 2 };
      
      await storage.store('backup-key', testData1, testPassword);
      await storage.store('backup-key', testData2, testPassword); // This should create a backup
      
      const backups = await storage.listBackups('backup-key');
      expect(backups.length).toBeGreaterThan(0);
    });

    it('should restore from backup', async () => {
      const testData1 = { version: 1 };
      const testData2 = { version: 2 };
      
      await storage.store('restore-key', testData1, testPassword);
      await storage.store('restore-key', testData2, testPassword);
      
      const backups = await storage.listBackups('restore-key');
      expect(backups.length).toBeGreaterThan(0);
      
      await storage.restoreFromBackup('restore-key', backups[0], testPassword);
      const restored = await storage.retrieve('restore-key', testPassword);
      
      // Should have restored to previous version
      expect(restored).toEqual(testData1);
    });

    it('should limit number of backups', async () => {
      const maxBackups = 3;
      
      // Create more backups than the limit
      for (let i = 0; i < maxBackups + 2; i++) {
        await storage.store('limit-key', { version: i }, testPassword);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const backups = await storage.listBackups('limit-key');
      expect(backups.length).toBeLessThanOrEqual(maxBackups);
    });
  });

  describe('storage statistics', () => {
    it('should provide storage statistics', async () => {
      await storage.store('stats1', { data: 'test1' }, testPassword);
      await storage.store('stats2', { data: 'test2' }, testPassword);
      
      const stats = await storage.getStats();
      
      expect(stats.totalKeys).toBe(2);
      expect(stats.encryptedKeys).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });

  describe('cleanup operations', () => {
    it('should cleanup all data', async () => {
      await storage.store('cleanup1', { data: 'test1' }, testPassword);
      await storage.store('cleanup2', { data: 'test2' }, testPassword);
      
      expect((await storage.listKeys()).length).toBe(2);
      
      await storage.cleanup();
      
      expect((await storage.listKeys()).length).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should throw error for empty key', async () => {
      await expect(storage.store('', { data: 'test' }, testPassword)).rejects.toThrow();
      await expect(storage.retrieve('', testPassword)).rejects.toThrow();
    });

    it('should handle file system errors gracefully', async () => {
      // Try to delete non-existent file
      await expect(storage.delete('non-existent')).resolves.not.toThrow();
    });

    it('should handle corrupted JSON files', async () => {
      // Create a corrupted file
      const filePath = join(testDir, 'corrupted.json');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(filePath, 'invalid json content');
      
      await expect(storage.retrieve('corrupted', testPassword)).rejects.toThrow();
    });
  });

  describe('non-encrypted storage', () => {
    let nonEncryptedStorage: SecureStorage;

    beforeEach(() => {
      nonEncryptedStorage = new SecureStorage(encryption, {
        baseDir: testDir + '-plain',
        encryptionEnabled: false,
        backupEnabled: false,
      });
    });

    afterEach(async () => {
      try {
        await fs.rmdir(testDir + '-plain', { recursive: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should store data without encryption when disabled', async () => {
      const testData = { message: 'plain text' };
      
      await nonEncryptedStorage.store('plain-key', testData);
      const retrieved = await nonEncryptedStorage.retrieve('plain-key');
      
      expect(retrieved).toEqual(testData);
      
      // Verify it's stored as plain text
      const filePath = join(testDir + '-plain', 'plain-key.json');
      const rawContent = await fs.readFile(filePath, 'utf8');
      const storedData = JSON.parse(rawContent);
      
      expect(storedData.metadata.encrypted).toBe(false);
      expect(typeof storedData.data).toBe('string');
    });
  });
});