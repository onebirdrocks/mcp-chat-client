import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Rate limiting store (in-memory for single-user deployment)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security configuration
export const SECURITY_CONFIG = {
  rateLimiting: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // requests per window
    skipSuccessfulRequests: false,
  },
  cors: {
    allowedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  },
  security: {
    maxBodySize: 10 * 1024 * 1024, // 10MB
    maxUrlLength: 2048,
    contentSecurityPolicy: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https://api.openai.com', 'https://api.deepseek.com'],
      'font-src': ["'self'"],
      'object-src': ["'none'"],
      'media-src': ["'self'"],
      'frame-src': ["'none'"],
    },
  },
};

// Rate limiting middleware
export function rateLimit(identifier: string): { allowed: boolean; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  const limit = rateLimitStore.get(key);

  if (!limit || now > limit.resetTime) {
    // Reset or create new limit
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + SECURITY_CONFIG.rateLimiting.windowMs,
    });
    return { allowed: true, resetTime: now + SECURITY_CONFIG.rateLimiting.windowMs };
  }

  if (limit.count >= SECURITY_CONFIG.rateLimiting.maxRequests) {
    return { allowed: false, resetTime: limit.resetTime };
  }

  limit.count++;
  return { allowed: true, resetTime: limit.resetTime };
}

// Get client identifier for rate limiting
export function getClientIdentifier(request: NextRequest): string {
  // In a single-user deployment, we can use a combination of IP and user agent
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Create a simple hash of IP + User Agent for identification
  return `${ip}-${userAgent.slice(0, 50)}`;
}

// CORS headers
export function setCorsHeaders(response: NextResponse, origin?: string): NextResponse {
  const allowedOrigins = SECURITY_CONFIG.cors.allowedOrigins;
  const requestOrigin = origin || '';

  if (allowedOrigins.includes(requestOrigin) || allowedOrigins.includes('*')) {
    response.headers.set('Access-Control-Allow-Origin', requestOrigin);
  }

  response.headers.set('Access-Control-Allow-Methods', SECURITY_CONFIG.cors.allowedMethods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', SECURITY_CONFIG.cors.allowedHeaders.join(', '));
  
  if (SECURITY_CONFIG.cors.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

// Security headers
export function setSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  const csp = Object.entries(SECURITY_CONFIG.security.contentSecurityPolicy)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Other security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS for HTTPS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}

// Request size validation
export function validateRequestSize(request: NextRequest): { valid: boolean; error?: string } {
  const contentLength = request.headers.get('content-length');
  const url = request.url;

  if (url.length > SECURITY_CONFIG.security.maxUrlLength) {
    return { valid: false, error: 'URL too long' };
  }

  if (contentLength && parseInt(contentLength) > SECURITY_CONFIG.security.maxBodySize) {
    return { valid: false, error: 'Request body too large' };
  }

  return { valid: true };
}

// Clean rate limit store periodically
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, limit] of rateLimitStore.entries()) {
    if (now > limit.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Start cleanup interval
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000); // Clean every 5 minutes
}