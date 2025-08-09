import { describe, it, expect } from 'vitest';
import { InputValidator, ValidationSchemas, validateBodySize, getBodySizeLimit } from '../validation';

describe('Input Validation', () => {
  describe('InputValidator', () => {
    describe('sanitizeHtml', () => {
      it('should remove dangerous HTML tags', () => {
        const input = '<script>alert("xss")</script><p>Safe content</p>';
        const result = InputValidator.sanitizeHtml(input);
        
        expect(result).not.toContain('<script>');
        expect(result).toContain('<p>Safe content</p>');
      });

      it('should allow safe HTML tags', () => {
        const input = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>';
        const result = InputValidator.sanitizeHtml(input);
        
        expect(result).toBe(input);
      });

      it('should remove event handlers', () => {
        const input = '<p onclick="alert()">Click me</p>';
        const result = InputValidator.sanitizeHtml(input);
        
        expect(result).not.toContain('onclick');
        expect(result).toContain('<p>Click me</p>');
      });
    });

    describe('sanitizeText', () => {
      it('should remove angle brackets', () => {
        const input = 'Hello <script>alert()</script> world';
        const result = InputValidator.sanitizeText(input);
        
        expect(result).toBe('Hello scriptalert()/script world');
      });

      it('should remove javascript protocol', () => {
        const input = 'javascript:alert("xss")';
        const result = InputValidator.sanitizeText(input);
        
        expect(result).toBe('alert("xss")');
      });

      it('should remove event handlers', () => {
        const input = 'onload=alert() onclick=hack()';
        const result = InputValidator.sanitizeText(input);
        
        expect(result).toBe('alert() hack()');
      });
    });

    describe('validateFilePath', () => {
      it('should allow safe relative paths', () => {
        expect(InputValidator.validateFilePath('folder/file.txt')).toBe(true);
        expect(InputValidator.validateFilePath('data/sessions/session.json')).toBe(true);
      });

      it('should reject directory traversal attempts', () => {
        expect(InputValidator.validateFilePath('../../../etc/passwd')).toBe(false);
        expect(InputValidator.validateFilePath('folder/../../../secret')).toBe(false);
        expect(InputValidator.validateFilePath('..\\windows\\system32')).toBe(false);
      });

      it('should reject absolute paths', () => {
        expect(InputValidator.validateFilePath('/etc/passwd')).toBe(false);
        expect(InputValidator.validateFilePath('C:\\Windows\\System32')).toBe(false);
      });

      it('should reject null bytes', () => {
        expect(InputValidator.validateFilePath('file\0.txt')).toBe(false);
      });
    });

    describe('validateApiKey', () => {
      it('should accept valid API keys', () => {
        expect(InputValidator.validateApiKey('sk-1234567890abcdef')).toBe(true);
        expect(InputValidator.validateApiKey('api_key_123456789012345')).toBe(true);
      });

      it('should reject invalid API keys', () => {
        expect(InputValidator.validateApiKey('short')).toBe(false);
        expect(InputValidator.validateApiKey('key with spaces')).toBe(false);
        expect(InputValidator.validateApiKey('key<script>')).toBe(false);
        expect(InputValidator.validateApiKey('')).toBe(false);
      });
    });

    describe('validateUrl', () => {
      it('should accept valid URLs', () => {
        expect(InputValidator.validateUrl('https://api.openai.com')).toBe(true);
        expect(InputValidator.validateUrl('http://localhost:3000')).toBe(true);
      });

      it('should reject invalid URLs', () => {
        expect(InputValidator.validateUrl('not-a-url')).toBe(false);
        expect(InputValidator.validateUrl('ftp://example.com')).toBe(false);
        expect(InputValidator.validateUrl('javascript:alert()')).toBe(false);
      });
    });

    describe('validateSessionId', () => {
      it('should accept valid session IDs', () => {
        expect(InputValidator.validateSessionId('session-123456')).toBe(true);
        expect(InputValidator.validateSessionId('abc123def456')).toBe(true);
      });

      it('should reject invalid session IDs', () => {
        expect(InputValidator.validateSessionId('short')).toBe(false);
        expect(InputValidator.validateSessionId('session with spaces')).toBe(false);
        expect(InputValidator.validateSessionId('session<script>')).toBe(false);
        expect(InputValidator.validateSessionId('')).toBe(false);
      });
    });
  });

  describe('ValidationSchemas', () => {
    describe('chatMessage', () => {
      it('should validate correct chat messages', () => {
        const validMessage = {
          content: 'Hello, world!',
          role: 'user',
          sessionId: 'session-123456',
        };

        expect(() => ValidationSchemas.chatMessage.parse(validMessage)).not.toThrow();
      });

      it('should reject invalid chat messages', () => {
        const invalidMessage = {
          content: '',
          role: 'invalid-role',
          sessionId: 'bad id',
        };

        expect(() => ValidationSchemas.chatMessage.parse(invalidMessage)).toThrow();
      });

      it('should sanitize content', () => {
        const messageWithHtml = {
          content: 'Hello <script>alert()</script> world',
          role: 'user',
          sessionId: 'session-123456',
        };

        const result = ValidationSchemas.chatMessage.parse(messageWithHtml);
        expect(result.content).not.toContain('<script>');
      });
    });

    describe('llmProvider', () => {
      it('should validate correct LLM provider config', () => {
        const validProvider = {
          id: 'openai-1',
          name: 'openai',
          apiKey: 'sk-1234567890abcdef',
          baseUrl: 'https://api.openai.com',
          enabled: true,
        };

        expect(() => ValidationSchemas.llmProvider.parse(validProvider)).not.toThrow();
      });

      it('should reject invalid provider config', () => {
        const invalidProvider = {
          id: '',
          name: 'invalid-provider',
          apiKey: 'short',
          baseUrl: 'not-a-url',
          enabled: 'not-boolean',
        };

        expect(() => ValidationSchemas.llmProvider.parse(invalidProvider)).toThrow();
      });
    });

    describe('mcpServer', () => {
      it('should validate correct MCP server config', () => {
        const validServer = {
          id: 'ebook-mcp',
          name: 'Ebook MCP Server',
          command: 'uv',
          args: ['run', 'main.py'],
          env: { PATH: '/usr/bin' },
          enabled: true,
        };

        expect(() => ValidationSchemas.mcpServer.parse(validServer)).not.toThrow();
      });

      it('should reject invalid server config', () => {
        const invalidServer = {
          id: '',
          name: '',
          command: '',
          args: 'not-an-array',
          enabled: 'not-boolean',
        };

        expect(() => ValidationSchemas.mcpServer.parse(invalidServer)).toThrow();
      });
    });
  });

  describe('validateBodySize', () => {
    it('should accept bodies within size limits', () => {
      const smallBody = JSON.stringify({ message: 'Hello' });
      expect(validateBodySize(smallBody, '/api/chat')).toBe(true);
    });

    it('should reject bodies exceeding size limits', () => {
      const largeBody = 'x'.repeat(200 * 1024); // 200KB
      expect(validateBodySize(largeBody, '/api/chat')).toBe(false);
    });
  });

  describe('getBodySizeLimit', () => {
    it('should return correct limits for different endpoints', () => {
      expect(getBodySizeLimit('/api/chat')).toBe(100 * 1024);
      expect(getBodySizeLimit('/api/settings')).toBe(10 * 1024);
      expect(getBodySizeLimit('/api/unknown')).toBe(1024 * 1024);
    });
  });
});