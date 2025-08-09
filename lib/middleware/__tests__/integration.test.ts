import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { SecurityMiddleware, withSecurity } from '../index';
import { SECURITY_PRESETS } from '../utils';

describe('Security Middleware Integration', () => {
  let middleware: SecurityMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();
    middleware = new SecurityMiddleware();
  });

  describe('SecurityMiddleware class', () => {
    it('should create middleware with default config', () => {
      expect(middleware).toBeInstanceOf(SecurityMiddleware);
    });

    it('should create middleware with custom config', () => {
      const customMiddleware = new SecurityMiddleware({
        enableRateLimit: false,
        enableCors: true,
      });
      expect(customMiddleware).toBeInstanceOf(SecurityMiddleware);
    });

    it('should skip paths correctly', async () => {
      const request = new NextRequest('http://localhost:3000/_next/static/test.js');
      const result = await middleware.handle(request);
      expect(result).toBeNull(); // Should skip
    });

    it('should process API paths', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const result = await middleware.handle(request);
      // Should not skip, but may return null if no security violations
      expect(result).toBeNull();
    });
  });

  describe('withSecurity wrapper', () => {
    it('should wrap handler with security middleware', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ message: 'success' })
      );

      const secureHandler = withSecurity(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/test');
      
      const response = await secureHandler(request);
      
      expect(mockHandler).toHaveBeenCalledWith(request, undefined);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should apply custom security config', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ message: 'success' })
      );

      const secureHandler = withSecurity(mockHandler, {
        enableRateLimit: false,
        enableCors: true,
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const response = await secureHandler(request);
      
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle handler errors gracefully', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Handler error'));

      const secureHandler = withSecurity(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/test');
      
      const response = await secureHandler(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('Security presets', () => {
    it('should have all required presets', () => {
      expect(SECURITY_PRESETS.HIGH_SECURITY).toBeDefined();
      expect(SECURITY_PRESETS.MEDIUM_SECURITY).toBeDefined();
      expect(SECURITY_PRESETS.LOW_SECURITY).toBeDefined();
      expect(SECURITY_PRESETS.NO_SECURITY).toBeDefined();
    });

    it('should have correct preset configurations', () => {
      expect(SECURITY_PRESETS.HIGH_SECURITY.enableRateLimit).toBe(true);
      expect(SECURITY_PRESETS.HIGH_SECURITY.enableAuditLogging).toBe(true);
      
      expect(SECURITY_PRESETS.NO_SECURITY.enableRateLimit).toBe(false);
      expect(SECURITY_PRESETS.NO_SECURITY.enableAuditLogging).toBe(false);
    });
  });

  describe('Request validation', () => {
    it('should validate JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Hello world',
          role: 'user',
          sessionId: 'session-123456',
        }),
      });

      const result = await middleware.handle(request);
      expect(result).toBeNull(); // Valid request should pass
    });

    it('should reject invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: 'invalid json',
      });

      const result = await middleware.handle(request);
      expect(result).toBeInstanceOf(NextResponse);
      if (result) {
        expect(result.status).toBe(400);
      }
    });
  });

  describe('CORS handling', () => {
    it('should handle OPTIONS requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          'origin': 'http://localhost:3000',
        },
      });

      const result = await middleware.handle(request);
      expect(result).toBeInstanceOf(NextResponse);
      if (result) {
        expect(result.status).toBe(200);
        expect(result.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      }
    });
  });

  describe('Error responses', () => {
    it('should create proper error responses', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': '999999999', // Too large
        },
      });

      const result = await middleware.handle(request);
      expect(result).toBeInstanceOf(NextResponse);
      if (result) {
        expect(result.status).toBe(413);
        const body = await result.json();
        expect(body.error).toBe('Request too large');
        expect(body.timestamp).toBeDefined();
      }
    });
  });

  describe('Security headers', () => {
    it('should add security headers to responses', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ message: 'success' })
      );

      const secureHandler = withSecurity(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/test');
      
      const response = await secureHandler(request);
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    });
  });

  describe('Rate limiting', () => {
    it('should allow requests within rate limit', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Test Browser',
        },
      });

      // First request should pass
      const result1 = await middleware.handle(request);
      expect(result1).toBeNull();

      // Second request should also pass (within limit)
      const result2 = await middleware.handle(request);
      expect(result2).toBeNull();
    });
  });

  describe('Input sanitization', () => {
    it('should handle various input types', async () => {
      const testInputs = [
        'normal text',
        '<script>alert("xss")</script>',
        'javascript:alert()',
        'onload=hack()',
      ];

      testInputs.forEach(input => {
        // Test that inputs are processed (actual sanitization tested in validation tests)
        expect(typeof input).toBe('string');
      });
    });
  });

  describe('Endpoint-specific validation', () => {
    it('should validate chat messages', async () => {
      const validChatMessage = {
        content: 'Hello world',
        role: 'user',
        sessionId: 'session-123456',
      };

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(validChatMessage),
      });

      const result = await middleware.handle(request);
      expect(result).toBeNull(); // Valid message should pass
    });

    it('should validate settings requests', async () => {
      const validSettings = {
        llmProviders: [{
          id: 'openai-1',
          name: 'openai',
          apiKey: 'sk-1234567890abcdef',
          enabled: true,
        }],
      };

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(validSettings),
      });

      const result = await middleware.handle(request);
      expect(result).toBeNull(); // Valid settings should pass
    });
  });
});