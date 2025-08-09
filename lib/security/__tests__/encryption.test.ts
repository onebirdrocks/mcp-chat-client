import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EncryptionService, DEFAULT_ENCRYPTION_CONFIG, encryptApiKey, decryptApiKey, maskApiKey } from '../encryption';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  const testPassword = 'test-password-123';
  const testData = 'sensitive-api-key-data';

  beforeEach(() => {
    encryptionService = new EncryptionService();
  });

  afterEach(() => {
    encryptionService.clearSensitiveData();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(encryptionService).toBeDefined();
    });

    it('should initialize with master key', async () => {
      await encryptionService.initialize(testPassword);
      expect(() => encryptionService.setMasterKey(Buffer.alloc(32))).not.toThrow();
    });

    it('should throw error for invalid master key length', () => {
      expect(() => encryptionService.setMasterKey(Buffer.alloc(16))).toThrow();
    });
  });

  describe('key derivation', () => {
    it('should derive consistent keys from same password and salt', async () => {
      const salt = Buffer.from('test-salt-16-bytes');
      const key1 = await encryptionService.deriveKey(testPassword, salt);
      const key2 = await encryptionService.deriveKey(testPassword, salt);
      
      expect(key1).toEqual(key2);
      expect(key1.length).toBe(DEFAULT_ENCRYPTION_CONFIG.keyLength);
    });

    it('should derive different keys from different salts', async () => {
      const salt1 = Buffer.from('test-salt-16-byte1');
      const salt2 = Buffer.from('test-salt-16-byte2');
      
      const key1 = await encryptionService.deriveKey(testPassword, salt1);
      const key2 = await encryptionService.deriveKey(testPassword, salt2);
      
      expect(key1).not.toEqual(key2);
    });
  });

  describe('encryption and decryption', () => {
    it('should encrypt and decrypt data with password', async () => {
      const encrypted = await encryptionService.encrypt(testData, testPassword);
      const decrypted = await encryptionService.decrypt(encrypted, testPassword);
      
      expect(decrypted).toBe(testData);
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.algorithm).toBe(DEFAULT_ENCRYPTION_CONFIG.algorithm);
    });

    it('should encrypt and decrypt data with master key', async () => {
      await encryptionService.initialize(testPassword);
      
      const encrypted = await encryptionService.encrypt(testData);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(testData);
    });

    it('should throw error when encrypting without key', async () => {
      await expect(encryptionService.encrypt(testData)).rejects.toThrow();
    });

    it('should throw error when decrypting without key', async () => {
      const encrypted = await encryptionService.encrypt(testData, testPassword);
      await expect(encryptionService.decrypt(encrypted)).rejects.toThrow();
    });

    it('should throw error for empty data', async () => {
      await expect(encryptionService.encrypt('', testPassword)).rejects.toThrow();
    });

    it('should throw error for invalid encrypted data', async () => {
      const invalidEncrypted = {
        encrypted: '',
        iv: 'invalid',
        tag: 'invalid',
        salt: 'invalid',
        algorithm: 'aes-256-gcm',
      };
      
      await expect(encryptionService.decrypt(invalidEncrypted, testPassword)).rejects.toThrow();
    });

    it('should fail decryption with wrong password', async () => {
      const encrypted = await encryptionService.encrypt(testData, testPassword);
      await expect(encryptionService.decrypt(encrypted, 'wrong-password')).rejects.toThrow();
    });
  });

  describe('hash generation and verification', () => {
    it('should generate consistent hashes', () => {
      const hash1 = encryptionService.generateHash(testData);
      const hash2 = encryptionService.generateHash(testData);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it('should generate different hashes for different data', () => {
      const hash1 = encryptionService.generateHash(testData);
      const hash2 = encryptionService.generateHash(testData + 'different');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should verify hash correctly', () => {
      const hash = encryptionService.generateHash(testData);
      
      expect(encryptionService.verifyHash(testData, hash)).toBe(true);
      expect(encryptionService.verifyHash(testData + 'different', hash)).toBe(false);
    });
  });

  describe('utility functions', () => {
    it('should generate random keys', () => {
      const key1 = encryptionService.generateRandomKey();
      const key2 = encryptionService.generateRandomKey();
      
      expect(key1).not.toEqual(key2);
      expect(key1.length).toBe(DEFAULT_ENCRYPTION_CONFIG.keyLength);
    });

    it('should clear sensitive data', async () => {
      await encryptionService.initialize(testPassword);
      encryptionService.clearSensitiveData();
      
      // Should throw error after clearing
      await expect(encryptionService.encrypt(testData)).rejects.toThrow();
    });
  });

  describe('utility functions', () => {
    it('should encrypt and decrypt API keys', async () => {
      const apiKey = 'sk-1234567890abcdef';
      const encrypted = await encryptApiKey(apiKey, testPassword);
      const decrypted = await decryptApiKey(encrypted, testPassword);
      
      expect(decrypted).toBe(apiKey);
    });

    it('should mask API keys correctly', () => {
      expect(maskApiKey('sk-1234567890abcdef')).toBe('****cdef');
      expect(maskApiKey('short')).toBe('****');
      expect(maskApiKey('')).toBe('****');
    });
  });

  describe('edge cases', () => {
    it('should handle unicode data', async () => {
      const unicodeData = '🔐 Secure data with émojis and spëcial chars 中文';
      const encrypted = await encryptionService.encrypt(unicodeData, testPassword);
      const decrypted = await encryptionService.decrypt(encrypted, testPassword);
      
      expect(decrypted).toBe(unicodeData);
    });

    it('should handle large data', async () => {
      const largeData = 'x'.repeat(10000);
      const encrypted = await encryptionService.encrypt(largeData, testPassword);
      const decrypted = await encryptionService.decrypt(encrypted, testPassword);
      
      expect(decrypted).toBe(largeData);
    });

    it('should handle JSON data', async () => {
      const jsonData = JSON.stringify({
        apiKey: 'sk-test',
        config: { model: 'gpt-4', temperature: 0.7 },
        array: [1, 2, 3],
      });
      
      const encrypted = await encryptionService.encrypt(jsonData, testPassword);
      const decrypted = await encryptionService.decrypt(encrypted, testPassword);
      
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(jsonData));
    });
  });
});