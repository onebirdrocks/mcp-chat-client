import { describe, it, expect } from 'vitest';
import {
  validateChatRequest,
  validateRunToolRequest,
  validateSettings,
  validateToolCall,
  validateApiKey,
  validateMCPServerConfig,
  validateUserPreferences,
  sanitizeInput,
  validateStringLength,
  validateUrl,
} from '../validation';
import { ValidationError } from '../errors';

describe('Validation Functions', () => {
  describe('validateChatRequest', () => {
    const validChatRequest = {
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello world',
          timestamp: new Date().toISOString(),
        },
      ],
      sessionId: 'session-123',
      provider: 'openai',
      model: 'gpt-4',
    };

    it('should validate a correct chat request', () => {
      expect(() => validateChatRequest(validChatRequest)).not.toThrow();
    });

    it('should reject invalid message IDs', () => {
      const invalidRequest = {
        ...validChatRequest,
        messages: [{ ...validChatRequest.messages[0], id: 'invalid id with spaces' }],
      };
      expect(() => validateChatRequest(invalidRequest)).toThrow(ValidationError);
    });

    it('should reject invalid session IDs', () => {
      const invalidRequest = {
        ...validChatRequest,
        sessionId: 'invalid session id',
      };
      expect(() => validateChatRequest(invalidRequest)).toThrow(ValidationError);
    });

    it('should reject invalid providers', () => {
      const invalidRequest = {
        ...validChatRequest,
        provider: 'invalid-provider',
      };
      expect(() => validateChatRequest(invalidRequest)).toThrow(ValidationError);
    });

    it('should sanitize message content', () => {
      const requestWithXSS = {
        ...validChatRequest,
        messages: [
          {
            ...validChatRequest.messages[0],
            content: '<script>alert("xss")</script>Hello',
          },
        ],
      };
      const result = validateChatRequest(requestWithXSS);
      expect(result.messages[0].content).toBe('Hello');
    });
  });

  describe('validateToolCall', () => {
    const validToolCall = {
      id: 'tool-call-1',
      type: 'function',
      function: {
        name: 'test_function',
        arguments: '{"param": "value"}',
      },
    };

    it('should validate a correct tool call', () => {
      expect(() => validateToolCall(validToolCall)).not.toThrow();
    });

    it('should reject invalid tool call IDs', () => {
      const invalidToolCall = {
        ...validToolCall,
        id: 'invalid id',
      };
      expect(() => validateToolCall(invalidToolCall)).toThrow(ValidationError);
    });

    it('should reject invalid function names', () => {
      const invalidToolCall = {
        ...validToolCall,
        function: {
          ...validToolCall.function,
          name: 'invalid-function-name!',
        },
      };
      expect(() => validateToolCall(invalidToolCall)).toThrow(ValidationError);
    });

    it('should reject invalid JSON arguments', () => {
      const invalidToolCall = {
        ...validToolCall,
        function: {
          ...validToolCall.function,
          arguments: 'invalid json',
        },
      };
      expect(() => validateToolCall(invalidToolCall)).toThrow(ValidationError);
    });
  });

  describe('validateApiKey', () => {
    it('should validate OpenAI API keys', () => {
      expect(() => validateApiKey('sk-test123456789', 'openai')).not.toThrow();
    });

    it('should validate DeepSeek API keys', () => {
      expect(() => validateApiKey('sk-test123456789', 'deepseek')).not.toThrow();
    });

    it('should validate OpenRouter API keys', () => {
      expect(() => validateApiKey('sk-or-test123456789', 'openrouter')).not.toThrow();
    });

    it('should reject short API keys', () => {
      expect(() => validateApiKey('short', 'openai')).toThrow(ValidationError);
    });

    it('should reject API keys with wrong prefix', () => {
      expect(() => validateApiKey('wrong-prefix-123456789', 'openai')).toThrow(ValidationError);
    });

    it('should reject API keys with suspicious patterns', () => {
      expect(() => validateApiKey('sk-test<script>', 'openai')).toThrow(ValidationError);
      expect(() => validateApiKey('sk-test javascript:', 'openai')).toThrow(ValidationError);
    });
  });

  describe('validateMCPServerConfig', () => {
    const validConfig = {
      id: 'server-1',
      name: 'test-server',
      command: 'node',
      args: ['server.js'],
      env: {
        NODE_ENV: 'production',
      },
    };

    it('should validate a correct MCP server config', () => {
      expect(() => validateMCPServerConfig(validConfig)).not.toThrow();
    });

    it('should reject invalid server IDs', () => {
      const invalidConfig = {
        ...validConfig,
        id: 'invalid id',
      };
      expect(() => validateMCPServerConfig(invalidConfig)).toThrow(ValidationError);
    });

    it('should reject invalid commands', () => {
      const invalidConfig = {
        ...validConfig,
        command: 'rm -rf /',
      };
      expect(() => validateMCPServerConfig(invalidConfig)).toThrow(ValidationError);
    });

    it('should reject invalid environment variable names', () => {
      const invalidConfig = {
        ...validConfig,
        env: {
          'invalid-env-name': 'value',
        },
      };
      expect(() => validateMCPServerConfig(invalidConfig)).toThrow(ValidationError);
    });
  });

  describe('validateUserPreferences', () => {
    const validPreferences = {
      theme: 'dark',
      language: 'en',
      autoScroll: true,
      soundEnabled: false,
    };

    it('should validate correct user preferences', () => {
      expect(() => validateUserPreferences(validPreferences)).not.toThrow();
    });

    it('should reject invalid theme', () => {
      const invalidPreferences = {
        ...validPreferences,
        theme: 'invalid-theme',
      };
      expect(() => validateUserPreferences(invalidPreferences)).toThrow(ValidationError);
    });

    it('should reject invalid language', () => {
      const invalidPreferences = {
        ...validPreferences,
        language: 'invalid-lang',
      };
      expect(() => validateUserPreferences(invalidPreferences)).toThrow(ValidationError);
    });
  });

  describe('validateSettings', () => {
    const validSettings = {
      llmProviders: [
        {
          id: 'openai-1',
          name: 'openai',
          apiKey: 'sk-test123456789',
          baseUrl: 'https://api.openai.com/v1',
        },
      ],
      mcpServers: [
        {
          id: 'server-1',
          name: 'test-server',
          command: 'node',
          args: ['server.js'],
        },
      ],
      preferences: {
        theme: 'dark',
        language: 'en',
        autoScroll: true,
        soundEnabled: false,
      },
    };

    it('should validate correct settings', () => {
      expect(() => validateSettings(validSettings)).not.toThrow();
    });

    it('should skip API key validation for masked keys', () => {
      const settingsWithMaskedKey = {
        ...validSettings,
        llmProviders: [
          {
            ...validSettings.llmProviders[0],
            apiKey: '***************2345',
          },
        ],
      };
      expect(() => validateSettings(settingsWithMaskedKey)).not.toThrow();
    });

    it('should reject invalid provider configurations', () => {
      const invalidSettings = {
        ...validSettings,
        llmProviders: [
          {
            ...validSettings.llmProviders[0],
            name: 'invalid-provider',
          },
        ],
      };
      expect(() => validateSettings(invalidSettings)).toThrow(ValidationError);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      expect(sanitizeInput(input)).toBe('Hello');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>Content';
      expect(sanitizeInput(input)).toBe('Content');
    });

    it('should remove javascript protocols', () => {
      const input = 'javascript:alert("xss")';
      expect(sanitizeInput(input)).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert()">Content</div>';
      expect(sanitizeInput(input)).not.toContain('onclick=');
    });

    it('should handle non-string input', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
      expect(sanitizeInput(123 as any)).toBe('');
    });
  });

  describe('validateStringLength', () => {
    it('should pass for strings within limit', () => {
      expect(() => validateStringLength('short', 'test', 10)).not.toThrow();
    });

    it('should throw for strings exceeding limit', () => {
      expect(() => validateStringLength('very long string', 'test', 5)).toThrow(ValidationError);
    });
  });

  describe('validateUrl', () => {
    it('should validate HTTPS URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
    });

    it('should validate HTTP URLs', () => {
      expect(validateUrl('http://example.com')).toBe(true);
    });

    it('should reject non-HTTP protocols', () => {
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('javascript:alert()')).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('')).toBe(false);
    });
  });
});