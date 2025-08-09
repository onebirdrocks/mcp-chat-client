import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { 
  rateLimit, 
  getClientIdentifier, 
  setCorsHeaders, 
  setSecurityHeaders, 
  validateRequestSize,
  SECURITY_CONFIG 
} from '../security';

describe('Security Middleware', () => {
  beforeEach(() => {
    // Clear rate limit store before each test
    vi.clearAllMocks();
  });

  describe('rateLimit', () => {
    it('should allow requests within rate limit', () => {
      const identifier = 'test-client';
      const result = rateLimit(identifier);
      
      expect(result.allowed).toBe(true);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should block requests exceeding rate limit', () => {
      const identifier = 'test-client-2';
      
      // Make requests up to the limit
      for (let i = 0; i < SECURITY_CONFIG.rateLimiting.maxRequests; i++) {
        const result = rateLimit(identifier);
        expect(result.allowed).toBe(true);
      }
      
      // Next request should be blocked
      const blockedResult = rateLimit(identifier);
      expect(blockedResult.allowed).toBe(false);
    });

    it('should reset rate limit after window expires', async () => {
      const identifier = 'test-client-3';
      
      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      let mockTime = originalNow();
      vi.spyOn(Date, 'now').mockImplementation(() => mockTime);
      
      // Exhaust rate limit
      for (let i = 0; i < SECURITY_CONFIG.rateLimiting.maxRequests; i++) {
        rateLimit(identifier);
      }
      
      // Should be blocked
      expect(rateLimit(identifier).allowed).toBe(false);
      
      // Advance time past window
      mockTime += SECURITY_CONFIG.rateLimiting.windowMs + 1000;
      
      // Should be allowed again
      expect(rateLimit(identifier).allowed).toBe(true);
      
      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('getClientIdentifier', () => {
    it('should generate identifier from IP and user agent', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Test Browser)',
        },
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toContain('192.168.1.1');
      expect(identifier).toContain('Mozilla/5.0 (Test Browser)');
    });

    it('should handle missing headers gracefully', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const identifier = getClientIdentifier(request);
      
      expect(identifier).toBeDefined();
      expect(typeof identifier).toBe('string');
    });
  });

  describe('validateRequestSize', () => {
    it('should allow requests within size limits', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': '1000',
        },
      });

      const result = validateRequestSize(request);
      expect(result.valid).toBe(true);
    });

    it('should reject requests exceeding body size limit', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': (SECURITY_CONFIG.security.maxBodySize + 1).toString(),
        },
      });

      const result = validateRequestSize(request);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Request body too large');
    });

    it('should reject requests with URLs that are too long', () => {
      const longUrl = 'http://localhost:3000/api/test?' + 'a'.repeat(SECURITY_CONFIG.security.maxUrlLength);
      const request = new NextRequest(longUrl);

      const result = validateRequestSize(request);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('URL too long');
    });
  });

  describe('setCorsHeaders', () => {
    it('should set CORS headers for allowed origins', () => {
      const mockResponse = {
        headers: new Map(),
        set: vi.fn(),
      } as any;

      mockResponse.headers.set = vi.fn();
      
      setCorsHeaders(mockResponse, 'http://localhost:3000');
      
      expect(mockResponse.headers.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin', 
        'http://localhost:3000'
      );
      expect(mockResponse.headers.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods', 
        expect.stringContaining('GET')
      );
    });

    it('should not set origin header for disallowed origins', () => {
      const mockResponse = {
        headers: new Map(),
        set: vi.fn(),
      } as any;

      mockResponse.headers.set = vi.fn();
      
      setCorsHeaders(mockResponse, 'http://malicious-site.com');
      
      // Should not set Access-Control-Allow-Origin for disallowed origin
      const originCalls = (mockResponse.headers.set as any).mock.calls.filter(
        (call: any[]) => call[0] === 'Access-Control-Allow-Origin'
      );
      expect(originCalls).toHaveLength(0);
    });
  });

  describe('setSecurityHeaders', () => {
    it('should set all required security headers', () => {
      const mockResponse = {
        headers: new Map(),
        set: vi.fn(),
      } as any;

      mockResponse.headers.set = vi.fn();
      
      setSecurityHeaders(mockResponse);
      
      expect(mockResponse.headers.set).toHaveBeenCalledWith(
        'Content-Security-Policy', 
        expect.stringContaining("default-src 'self'")
      );
      expect(mockResponse.headers.set).toHaveBeenCalledWith(
        'X-Content-Type-Options', 
        'nosniff'
      );
      expect(mockResponse.headers.set).toHaveBeenCalledWith(
        'X-Frame-Options', 
        'DENY'
      );
      expect(mockResponse.headers.set).toHaveBeenCalledWith(
        'X-XSS-Protection', 
        '1; mode=block'
      );
    });

    it('should set HSTS header in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockResponse = {
        headers: new Map(),
        set: vi.fn(),
      } as any;

      mockResponse.headers.set = vi.fn();
      
      setSecurityHeaders(mockResponse);
      
      expect(mockResponse.headers.set).toHaveBeenCalledWith(
        'Strict-Transport-Security', 
        'max-age=31536000; includeSubDomains'
      );

      process.env.NODE_ENV = originalEnv;
    });
  });
});