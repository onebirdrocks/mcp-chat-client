import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EncryptionService } from '../encryption';
import { validateAndSanitizeInput, validateJsonInput } from '../rateLimit';
import { sanitizeInput, validateStringLength, validateUrl } from '../validation';

describe('Security Features', () => {
  describe('EncryptionService', () => {
    let encryptionService: EncryptionService;

    beforeEach(() => {
      // Set a test encryption key
      process.env.ENCRYPTION_KEY = 'test-key-for-encryption-testing-12345';
      encryptionService = new EncryptionService();
    });

    afterEach(() => {
      delete process.env.ENCRYPTION_KEY;
    });

    it('should encrypt and decrypt data correctly', () => {
      const testData = 'sk-test-api-key-12345';
      const encrypted = encryptionService.encrypt(testData);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(encrypted).not.toBe(testData);
      expect(decrypted).toBe(testData);
    });

    it('should handle empty strings', () => {
      const encrypted = encryptionService.encrypt('');
      const decrypted = encryptionService.decrypt('');

      expect(encrypted).toBe('');
      expect(decrypted).toBe('');
    });

    it('should mask API keys correctly', () => {
      const apiKey = 'sk-test-api-key-12345';
      const masked = encryptionService.maskApiKey(apiKey);

      expect(masked).toBe('*****************2345');
      expect(masked).not.toContain('sk-test');
    });

    it('should handle short API keys', () => {
      const shortKey = 'short';
      const masked = encryptionService.maskApiKey(shortKey);

      expect(masked).toBe('****');
    });

    it('should generate secure keys', () => {
      const key1 = encryptionService.generateSecureKey();
      const key2 = encryptionService.generateSecureKey();

      expect(key1).not.toBe(key2);
      expect(key1.length).toBeGreaterThan(20);
    });

    it('should hash data consistently', () => {
      const data = 'test-data';
      const hash1 = encryptionService.hash(data);
      const hash2 = encryptionService.hash(data);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA256 hex length
    });

    it('should detect encrypted data', () => {
      const plaintext = 'test-data';
      const encrypted = encryptionService.encrypt(plaintext);

      expect(encryptionService.isEncrypted(encrypted)).toBe(true);
      expect(encryptionService.isEncrypted(plaintext)).toBe(false);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should sanitize XSS attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = sanitizeInput(maliciousInput);

      expect(sanitized).toBe('Hello World');
      expect(sanitized).not.toContain('<script>');
    });

    it('should remove javascript protocols', () => {
      const maliciousInput = 'javascript:alert("xss")';
      const sanitized = sanitizeInput(maliciousInput);

      expect(sanitized).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const maliciousInput = '<div onclick="alert()">Content</div>';
      const sanitized = sanitizeInput(maliciousInput);

      expect(sanitized).not.toContain('onclick=');
    });

    it('should validate string length', () => {
      expect(() => validateStringLength('short', 'test', 10)).not.toThrow();
      expect(() => validateStringLength('very long string', 'test', 5)).toThrow();
    });

    it('should validate URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://example.com')).toBe(true);
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('javascript:alert()')).toBe(false);
      expect(validateUrl('not-a-url')).toBe(false);
    });

    it('should validate and sanitize input with length limits', () => {
      const validInput = 'Hello World';
      const result = validateAndSanitizeInput(validInput, 20);
      expect(result).toBe(validInput);

      expect(() => validateAndSanitizeInput('x'.repeat(1000), 100)).toThrow();
      expect(() => validateAndSanitizeInput(123, 100)).toThrow();
    });

    it('should validate JSON input with size limits', () => {
      const validJson = '{"key": "value"}';
      const result = validateJsonInput(validJson, 1000);
      expect(result).toEqual({ key: 'value' });

      expect(() => validateJsonInput('x'.repeat(1000), 100)).toThrow();
      expect(() => validateJsonInput('invalid json', 1000)).toThrow();
    });
  });

  describe('Security Headers', () => {
    it('should include all required security headers', async () => {
      // This would be tested in integration tests with actual HTTP requests
      // Here we just verify the header configuration exists
      const { getSecurityHeaders } = await import('../cors');
      const headers = getSecurityHeaders();

      expect(headers).toHaveProperty('X-XSS-Protection');
      expect(headers).toHaveProperty('X-Content-Type-Options');
      expect(headers).toHaveProperty('X-Frame-Options');
      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit calculations', async () => {
      // This would require more complex testing with actual rate limiter
      // For now, we just verify the module loads correctly
      const { withRateLimit } = await import('../rateLimit');
      expect(typeof withRateLimit).toBe('function');
    });
  });
});