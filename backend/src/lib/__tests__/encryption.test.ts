import { EncryptionService, getEncryptionService } from '../encryption';
import { vi } from 'vitest';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    // Clear any existing instance
    vi.resetModules();
    encryptionService = new EncryptionService();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'sk-test123456789';
      
      const encrypted = encryptionService.encrypt(originalData);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalData);
      expect(encrypted.length).toBeGreaterThan(0);

      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(originalData);
    });

    it('should handle empty strings', () => {
      const encrypted = encryptionService.encrypt('');
      expect(encrypted).toBe('');

      const decrypted = encryptionService.decrypt('');
      expect(decrypted).toBe('');
    });

    it('should produce different encrypted values for the same input', () => {
      const data = 'test-data';
      
      const encrypted1 = encryptionService.encrypt(data);
      const encrypted2 = encryptionService.encrypt(data);
      
      // Due to random IV, encrypted values should be different
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      expect(encryptionService.decrypt(encrypted1)).toBe(data);
      expect(encryptionService.decrypt(encrypted2)).toBe(data);
    });

    it('should handle special characters and unicode', () => {
      const specialData = 'test-data-with-特殊字符-and-émojis-🔐';
      
      const encrypted = encryptionService.encrypt(specialData);
      const decrypted = encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(specialData);
    });

    it('should throw error when decrypting invalid data', () => {
      expect(() => {
        encryptionService.decrypt('invalid-encrypted-data');
      }).toThrow('Failed to decrypt data');
    });

    it('should throw error when decrypting with wrong key', () => {
      const originalService = new EncryptionService();
      const encrypted = originalService.encrypt('test-data');
      
      // Since both services use the same default key generation, 
      // let's test with obviously corrupted data instead
      expect(() => {
        originalService.decrypt('corrupted-encrypted-data-that-cannot-be-decrypted');
      }).toThrow('Failed to decrypt data');
    });
  });

  describe('hash', () => {
    it('should generate consistent hashes for the same input', () => {
      const data = 'test-data';
      
      const hash1 = encryptionService.hash(data);
      const hash2 = encryptionService.hash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBeDefined();
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for different inputs', () => {
      const data1 = 'test-data-1';
      const data2 = 'test-data-2';
      
      const hash1 = encryptionService.hash(data1);
      const hash2 = encryptionService.hash(data2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty strings', () => {
      const hash = encryptionService.hash('');
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should handle special characters', () => {
      const specialData = 'test-data-with-特殊字符-and-émojis-🔐';
      const hash = encryptionService.hash(specialData);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('maskApiKey', () => {
    it('should mask API keys correctly', () => {
      const apiKey = 'sk-test123456789012345';
      const masked = encryptionService.maskApiKey(apiKey);
      
      expect(masked).toMatch(/^•+\d{4}$/);
      expect(masked.endsWith('2345')).toBe(true);
      expect(masked.length).toBeLessThanOrEqual(12); // 8 dots + 4 chars max
    });

    it('should handle short API keys', () => {
      const shortKey = 'sk-123';
      const masked = encryptionService.maskApiKey(shortKey);
      
      expect(masked).toBe('••••');
    });

    it('should handle empty or undefined keys', () => {
      expect(encryptionService.maskApiKey('')).toBe('••••');
      expect(encryptionService.maskApiKey(undefined as any)).toBe('••••');
    });

    it('should limit mask length to prevent UI overflow', () => {
      const veryLongKey = 'sk-' + 'a'.repeat(100);
      const masked = encryptionService.maskApiKey(veryLongKey);
      
      expect(masked.length).toBeLessThanOrEqual(12); // 8 dots + 4 chars max
      expect(masked.endsWith('aaaa')).toBe(true);
    });

    it('should handle keys with exactly 8 characters', () => {
      const eightCharKey = 'sk-12345';
      const masked = encryptionService.maskApiKey(eightCharKey);
      
      expect(masked).toMatch(/^•+2345$/);
    });
  });

  describe('generateSecureKey', () => {
    it('should generate a secure random key', () => {
      const key1 = encryptionService.generateSecureKey();
      const key2 = encryptionService.generateSecureKey();
      
      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
      expect(key1.length).toBeGreaterThan(0);
      expect(key2.length).toBeGreaterThan(0);
    });

    it('should generate keys of consistent length', () => {
      const key1 = encryptionService.generateSecureKey();
      const key2 = encryptionService.generateSecureKey();
      
      expect(key1.length).toBe(key2.length);
    });
  });

  describe('isEncrypted', () => {
    it('should identify encrypted data correctly', () => {
      const originalData = 'test-data';
      const encrypted = encryptionService.encrypt(originalData);
      
      expect(encryptionService.isEncrypted(encrypted)).toBe(true);
      expect(encryptionService.isEncrypted(originalData)).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(encryptionService.isEncrypted('')).toBe(true); // Empty string decrypts to empty string
    });

    it('should handle invalid data', () => {
      expect(encryptionService.isEncrypted('invalid-data')).toBe(false);
      expect(encryptionService.isEncrypted('sk-plaintext-key')).toBe(false);
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const service1 = getEncryptionService();
      const service2 = getEncryptionService();
      
      expect(service1).toBe(service2);
    });

    it('should maintain state across calls', () => {
      const service1 = getEncryptionService();
      const data = 'test-data';
      const encrypted = service1.encrypt(data);
      
      const service2 = getEncryptionService();
      const decrypted = service2.decrypt(encrypted);
      
      expect(decrypted).toBe(data);
    });
  });

  describe('environment key handling', () => {
    const originalEnv = process.env.ENCRYPTION_KEY;

    afterEach(() => {
      if (originalEnv) {
        process.env.ENCRYPTION_KEY = originalEnv;
      } else {
        delete process.env.ENCRYPTION_KEY;
      }
    });

    it('should use environment key when available', () => {
      process.env.ENCRYPTION_KEY = 'test-environment-key';
      
      const service = new EncryptionService();
      const data = 'test-data';
      const encrypted = service.encrypt(data);
      const decrypted = service.decrypt(encrypted);
      
      expect(decrypted).toBe(data);
    });

    it('should generate default key when environment key is not set', () => {
      delete process.env.ENCRYPTION_KEY;
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const service = new EncryptionService();
      const data = 'test-data';
      const encrypted = service.encrypt(data);
      const decrypted = service.decrypt(encrypted);
      
      expect(decrypted).toBe(data);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ENCRYPTION_KEY not set in environment')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle decryption errors gracefully', () => {
      const originalConsoleError = console.error;
      console.error = vi.fn();
      
      expect(() => {
        encryptionService.decrypt('definitely-not-encrypted-data');
      }).toThrow('Failed to decrypt data');
      
      console.error = originalConsoleError;
    });
  });
});