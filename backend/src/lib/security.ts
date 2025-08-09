import { NextRequest, NextResponse } from 'next/server';
import { withCors } from './cors';
import { withRateLimit } from './rateLimit';
import { handleAsyncRoute, ValidationError } from './errors';

/**
 * Comprehensive security middleware that combines all security features
 */
export function withSecurity(
  handler: (request: Request, context?: any) => Promise<NextResponse>,
  options: {
    rateLimit?: boolean;
    cors?: boolean;
    validation?: boolean;
    maxBodySize?: number;
  } = {}
) {
  const {
    rateLimit = true,
    cors = true,
    validation = true,
    maxBodySize = 1024 * 1024, // 1MB default
  } = options;

  let secureHandler = handler;

  // Apply validation middleware
  if (validation) {
    secureHandler = withValidation(secureHandler, { maxBodySize });
  }

  // Apply rate limiting
  if (rateLimit) {
    secureHandler = withRateLimit(secureHandler);
  }

  // Apply CORS
  if (cors) {
    secureHandler = withCors(secureHandler);
  }

  // Apply error handling
  secureHandler = handleAsyncRoute(secureHandler);

  return secureHandler;
}

/**
 * Input validation middleware
 */
function withValidation(
  handler: (request: Request, context?: any) => Promise<NextResponse>,
  options: { maxBodySize: number }
) {
  return async (request: Request, context?: any) => {
    const nextRequest = request as NextRequest;

    // Check content length
    const contentLength = nextRequest.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > options.maxBodySize) {
      return NextResponse.json(
        {
          error: 'Payload too large',
          message: `Request body exceeds maximum size of ${options.maxBodySize} bytes`,
          statusCode: 413,
        },
        { status: 413 }
      );
    }

    // Validate content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = nextRequest.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        return NextResponse.json(
          {
            error: 'Invalid content type',
            message: 'Content-Type must be application/json',
            statusCode: 415,
          },
          { status: 415 }
        );
      }
    }

    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-host',
      'x-original-url',
      'x-rewrite-url',
    ];

    for (const header of suspiciousHeaders) {
      if (nextRequest.headers.get(header)) {
        console.warn(`🚨 Suspicious header detected: ${header}`, {
          url: request.url,
          ip: nextRequest.headers.get('x-forwarded-for') || 'unknown',
          userAgent: nextRequest.headers.get('user-agent') || 'unknown',
        });
      }
    }

    // Validate URL path
    const url = new URL(request.url);
    if (containsSuspiciousPatterns(url.pathname)) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Request contains suspicious patterns',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    return handler(request, context);
  };
}

/**
 * Check for suspicious patterns in URL paths
 */
function containsSuspiciousPatterns(path: string): boolean {
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /\/\//,  // Double slashes
    /%2e%2e/i,  // URL encoded path traversal
    /%00/i,  // Null bytes
    /\x00/,  // Null bytes
    /<script/i,  // Script tags
    /javascript:/i,  // JavaScript protocol
    /vbscript:/i,  // VBScript protocol
    /data:text\/html/i,  // Data URLs with HTML
    /on\w+=/i,  // Event handlers
  ];

  return suspiciousPatterns.some(pattern => pattern.test(path));
}

/**
 * Security headers for API responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Remove server information
  response.headers.delete('server');
  response.headers.delete('x-powered-by');

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy for API
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none';"
  );

  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

/**
 * Sanitize request body to prevent injection attacks
 */
export function sanitizeRequestBody(body: any): any {
  if (typeof body === 'string') {
    return sanitizeString(body);
  }

  if (Array.isArray(body)) {
    return body.map(item => sanitizeRequestBody(item));
  }

  if (body && typeof body === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(body)) {
      // Sanitize keys
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeRequestBody(value);
    }
    return sanitized;
  }

  return body;
}

/**
 * Sanitize string values
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string') {
    return str;
  }

  // Remove dangerous patterns
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Log security events
 */
export function logSecurityEvent(
  event: string,
  details: {
    request?: Request;
    ip?: string;
    userAgent?: string;
    severity?: 'low' | 'medium' | 'high';
    [key: string]: any;
  }
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity: details.severity || 'medium',
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    ...details,
  };

  // In production, this would go to a proper logging service
  if (details.severity === 'high') {
    console.error('🚨 HIGH SEVERITY SECURITY EVENT:', logEntry);
  } else if (details.severity === 'medium') {
    console.warn('⚠️ SECURITY EVENT:', logEntry);
  } else {
    console.info('ℹ️ Security event:', logEntry);
  }
}

/**
 * Validate file upload (if needed in the future)
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): void {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['application/json', 'text/plain'],
    allowedExtensions = ['.json', '.txt'],
  } = options;

  if (file.size > maxSize) {
    throw new ValidationError(`File size exceeds maximum of ${maxSize} bytes`);
  }

  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError(`File type ${file.type} is not allowed`);
  }

  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    throw new ValidationError(`File extension ${extension} is not allowed`);
  }
}

/**
 * Generate secure random tokens
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Use crypto.getRandomValues if available (browser/Node.js)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    // Fallback to Math.random (less secure)
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  
  return result;
}