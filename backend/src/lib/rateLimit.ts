import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from './errors';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request is within rate limit
   */
  checkLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      const resetTime = now + this.windowMs;
      this.requests.set(identifier, { count: 1, resetTime });
      return { allowed: true, remaining: this.maxRequests - 1, resetTime };
    }

    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    // Increment count
    entry.count++;
    this.requests.set(identifier, entry);
    return { allowed: true, remaining: this.maxRequests - entry.count, resetTime: entry.resetTime };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Shutdown the rate limiter
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}

// Global rate limiter instance
let rateLimiter: RateLimiter | null = null;

function getRateLimiter(): RateLimiter {
  if (!rateLimiter) {
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
    rateLimiter = new RateLimiter(windowMs, maxRequests);
  }
  return rateLimiter;
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers (for reverse proxy setups)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 
             request.ip || 'unknown';
  
  // In development, use a more permissive identifier
  if (process.env.NODE_ENV === 'development') {
    return `dev-${ip}`;
  }
  
  return ip;
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  handler: (request: Request, context?: any) => Promise<NextResponse>,
  options: { windowMs?: number; maxRequests?: number } = {}
) {
  return async (request: Request, context?: any) => {
    // Skip rate limiting if disabled
    if (process.env.RATE_LIMIT_ENABLED === 'false') {
      return handler(request, context);
    }

    const nextRequest = request as NextRequest;
    const identifier = getClientIdentifier(nextRequest);
    const limiter = getRateLimiter();
    
    const { allowed, remaining, resetTime } = limiter.checkLimit(identifier);
    
    if (!allowed) {
      const resetDate = new Date(resetTime);
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again after ${resetDate.toISOString()}`,
          statusCode: 429,
        },
        { status: 429 }
      );
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', limiter['maxRequests'].toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
      response.headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString());
      
      return response;
    }

    try {
      const response = await handler(request, context);
      
      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', limiter['maxRequests'].toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
      
      return response;
    } catch (error) {
      console.error('Rate Limited Handler Error:', error);
      
      // Ensure we return a proper JSON error response
      if (error instanceof Error && 'statusCode' in error) {
        const statusCode = (error as any).statusCode || 500;
        const response = NextResponse.json(
          {
            error: error.name || 'Error',
            message: error.message,
            statusCode,
          },
          { status: statusCode }
        );
        
        // Add rate limit headers to error responses too
        response.headers.set('X-RateLimit-Limit', limiter['maxRequests'].toString());
        response.headers.set('X-RateLimit-Remaining', remaining.toString());
        response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
        
        return response;
      }
      
      throw error;
    }
  };
}

/**
 * Enhanced input validation with rate limiting considerations
 */
export function validateAndSanitizeInput(input: any, maxLength: number = 10000): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string');
  }
  
  if (input.length > maxLength) {
    throw new ValidationError(`Input too long. Maximum length is ${maxLength} characters`);
  }
  
  // Basic XSS prevention
  const sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:text\/html/gi, '')
    .trim();
  
  return sanitized;
}

/**
 * Validate JSON input with size limits
 */
export function validateJsonInput(input: string, maxSize: number = 1024 * 1024): any {
  if (input.length > maxSize) {
    throw new ValidationError(`JSON input too large. Maximum size is ${maxSize} bytes`);
  }
  
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new ValidationError('Invalid JSON format');
  }
}

// Cleanup on process exit
process.on('SIGTERM', () => {
  if (rateLimiter) {
    rateLimiter.shutdown();
  }
});

process.on('SIGINT', () => {
  if (rateLimiter) {
    rateLimiter.shutdown();
  }
});