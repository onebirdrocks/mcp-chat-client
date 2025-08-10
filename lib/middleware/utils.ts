import { NextRequest, NextResponse } from 'next/server';
import { withSecurity, SecurityMiddlewareConfig } from './index';
import { z } from 'zod';

// Helper to create secure API route handlers
export function createSecureHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  config?: Partial<SecurityMiddlewareConfig>
) {
  return withSecurity(handler, config);
}

// Helper to validate request body with Zod schema
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { 
        success: false, 
        error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
  } catch (error) {
    return { success: false, error: 'Invalid JSON body' };
  }
}

// Helper to create standardized error responses
export function createErrorResponse(
  message: string,
  status: number = 400,
  details?: Record<string, any>
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      timestamp: new Date().toISOString(),
      ...details,
    },
    { status }
  );
}

// Helper to create standardized success responses
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  metadata?: Record<string, any>
): NextResponse {
  return NextResponse.json(
    {
      data,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
    { status }
  );
}

// Security configuration presets for different types of endpoints
export const SECURITY_PRESETS = {
  // High security for sensitive operations
  HIGH_SECURITY: {
    enableRateLimit: true,
    enableCors: true,
    enableSecurityHeaders: true,
    enableAuditLogging: true,
    enableInputValidation: true,
  } as SecurityMiddlewareConfig,

  // Medium security for regular API endpoints
  MEDIUM_SECURITY: {
    enableRateLimit: true,
    enableCors: true,
    enableSecurityHeaders: true,
    enableAuditLogging: true,
    enableInputValidation: true,
  } as SecurityMiddlewareConfig,

  // Low security for public endpoints
  LOW_SECURITY: {
    enableRateLimit: true,
    enableCors: true,
    enableSecurityHeaders: true,
    enableAuditLogging: false,
    enableInputValidation: false,
  } as SecurityMiddlewareConfig,

  // No security for health checks and static content
  NO_SECURITY: {
    enableRateLimit: false,
    enableCors: false,
    enableSecurityHeaders: false,
    enableAuditLogging: false,
    enableInputValidation: false,
  } as SecurityMiddlewareConfig,
};

// Helper to apply security preset
export function withSecurityPreset(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  preset: keyof typeof SECURITY_PRESETS
) {
  return withSecurity(handler, SECURITY_PRESETS[preset]);
}

// Helper to extract and validate session ID from request
export function extractSessionId(request: NextRequest): string | null {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId') || 
                   url.pathname.split('/').find(segment => segment.match(/^[a-zA-Z0-9\-_]{8,64}$/));
  
  return sessionId || null;
}

// Helper to extract client IP address
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwarded ? forwarded.split(',')[0] : realIP || request.ip || 'unknown';
  return ip.trim();
}

// Helper to check if request is from localhost
export function isLocalhost(request: NextRequest): boolean {
  const ip = getClientIP(request);
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
}

// Helper to validate API key format (without revealing the key)
export function validateApiKeyFormat(apiKey: string): boolean {
  // Basic validation - should be alphanumeric with some special chars
  const apiKeyRegex = /^[a-zA-Z0-9\-_\.]+$/;
  return apiKeyRegex.test(apiKey) && apiKey.length >= 10 && apiKey.length <= 200;
}

// Helper to mask sensitive data in logs
export function maskSensitiveData(data: any): any {
  if (typeof data === 'string') {
    return data
      .replace(/sk-[a-zA-Z0-9]{32,}/g, 'sk-***')
      .replace(/Bearer\s+[a-zA-Z0-9\-_\.]+/g, 'Bearer ***')
      .replace(/"apiKey":\s*"[^"]+"/g, '"apiKey": "***"')
      .replace(/"password":\s*"[^"]+"/g, '"password": "***"');
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }

  if (typeof data === 'object' && data !== null) {
    const masked: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('key') || lowerKey.includes('password') || lowerKey.includes('token')) {
        masked[key] = '***';
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }

  return data;
}

// Helper to create rate limit headers
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetTime: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
  return response;
}