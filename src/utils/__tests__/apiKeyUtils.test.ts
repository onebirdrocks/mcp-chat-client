import { describe, it, expect } from 'vitest';
import { 
  isEmptyOrMaskedApiKey, 
  maskApiKey, 
  validateApiKeyFormat, 
  cleanApiKey,
  formatApiKeyForDisplay,
  getApiKeyStatus,
  truncateUrl
} from '../apiKeyUtils';

describe('apiKeyUtils', () => {
  describe('isEmptyOrMaskedApiKey', () => {
    it('should return true for empty or undefined keys', () => {
      expect(isEmptyOrMaskedApiKey('')).toBe(true);
      expect(isEmptyOrMaskedApiKey(undefined)).toBe(true);
      expect(isEmptyOrMaskedApiKey('   ')).toBe(true);
    });

    it('should return true for masked keys', () => {
      expect(isEmptyOrMaskedApiKey('••••')).toBe(true);
      expect(isEmptyOrMaskedApiKey('****')).toBe(true);
      expect(isEmptyOrMaskedApiKey('••••abcd')).toBe(true);
      expect(isEmptyOrMaskedApiKey('****abcd')).toBe(true);
    });

    it('should return true for placeholder patterns', () => {
      expect(isEmptyOrMaskedApiKey('sk-....')).toBe(true);
      expect(isEmptyOrMaskedApiKey('sk-or-....')).toBe(true);
    });

    it('should return false for valid API keys', () => {
      expect(isEmptyOrMaskedApiKey('sk-1234567890abcdef')).toBe(false);
      expect(isEmptyOrMaskedApiKey('sk-or-1234567890abcdef')).toBe(false);
    });
  });

  describe('maskApiKey', () => {
    it('should mask API keys correctly', () => {
      expect(maskApiKey('sk-1234567890abcdef')).toBe('•••••••••••••••cdef');
      expect(maskApiKey('sk-or-1234567890abcdef')).toBe('••••••••••••••••••cdef');
    });

    it('should handle short keys', () => {
      expect(maskApiKey('short')).toBe('••••');
      expect(maskApiKey('')).toBe('••••');
    });
  });

  describe('validateApiKeyFormat', () => {
    it('should validate OpenAI keys', () => {
      expect(validateApiKeyFormat('sk-1234567890abcdef', 'openai')).toEqual({ valid: true });
      expect(validateApiKeyFormat('invalid-key', 'openai')).toEqual({ 
        valid: false, 
        error: 'OpenAI API key must start with "sk-"' 
      });
    });

    it('should validate DeepSeek keys', () => {
      expect(validateApiKeyFormat('sk-1234567890abcdef', 'deepseek')).toEqual({ valid: true });
      expect(validateApiKeyFormat('invalid-key', 'deepseek')).toEqual({ 
        valid: false, 
        error: 'DeepSeek API key must start with "sk-"' 
      });
    });

    it('should validate OpenRouter keys', () => {
      expect(validateApiKeyFormat('sk-or-1234567890abcdef', 'openrouter')).toEqual({ valid: true });
      expect(validateApiKeyFormat('sk-1234567890abcdef', 'openrouter')).toEqual({ 
        valid: false, 
        error: 'OpenRouter API key must start with "sk-or-"' 
      });
    });

    it('should reject keys that are too short', () => {
      expect(validateApiKeyFormat('sk-123', 'openai')).toEqual({ 
        valid: false, 
        error: 'API key is too short' 
      });
    });

    it('should reject keys with invalid characters', () => {
      expect(validateApiKeyFormat('sk-123 456', 'openai')).toEqual({ 
        valid: false, 
        error: 'API key contains invalid characters' 
      });
    });

    it('should reject masked keys', () => {
      expect(validateApiKeyFormat('••••abcd', 'openai')).toEqual({ 
        valid: false, 
        error: 'API key is empty or masked' 
      });
    });
  });

  describe('cleanApiKey', () => {
    it('should clean API keys', () => {
      expect(cleanApiKey('  sk-1234567890abcdef  ')).toBe('sk-1234567890abcdef');
      expect(cleanApiKey('')).toBe('');
    });
  });

  describe('formatApiKeyForDisplay', () => {
    it('should format API keys for display', () => {
      expect(formatApiKeyForDisplay('sk-1234567890abcdef')).toBe('•••••••••••••••cdef');
      expect(formatApiKeyForDisplay('')).toBe('••••');
    });
  });

  describe('getApiKeyStatus', () => {
    it('should return correct status for empty keys', () => {
      expect(getApiKeyStatus('')).toEqual({ configured: false, masked: false, valid: false });
      expect(getApiKeyStatus(undefined)).toEqual({ configured: false, masked: false, valid: false });
    });

    it('should return correct status for masked keys', () => {
      expect(getApiKeyStatus('••••abcd')).toEqual({ configured: true, masked: true, valid: true });
      expect(getApiKeyStatus('****abcd')).toEqual({ configured: true, masked: true, valid: true });
    });

    it('should return correct status for valid keys', () => {
      expect(getApiKeyStatus('sk-1234567890abcdef')).toEqual({ configured: true, masked: false, valid: true });
    });

    it('should return correct status for invalid keys', () => {
      expect(getApiKeyStatus('sk-123')).toEqual({ 
        configured: true, 
        masked: false, 
        valid: false, 
        error: 'API key is too short' 
      });
    });
  });

  describe('truncateUrl', () => {
    it('should not truncate short URLs', () => {
      const shortUrl = 'https://api.openai.com/v1';
      expect(truncateUrl(shortUrl, 50)).toBe(shortUrl);
    });

    it('should truncate long URLs correctly', () => {
      const longUrl = 'https://api.openai.com/v1/chat/completions?model=gpt-4&temperature=0.7&max_tokens=1000';
      const result = truncateUrl(longUrl, 50);
      expect(result).toContain('https://api.openai.com');
      expect(result).toContain('...');
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should handle invalid URLs', () => {
      const invalidUrl = 'not-a-valid-url-but-very-long-string-that-needs-truncation';
      const result = truncateUrl(invalidUrl, 20);
      expect(result).toBe('not-a-valid-url-b...');
    });

    it('should handle empty URLs', () => {
      expect(truncateUrl('', 50)).toBe('');
    });
  });
});