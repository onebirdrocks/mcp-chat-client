# Security Middleware

This directory contains comprehensive security middleware for the MCP Chat UI application, providing rate limiting, input validation, XSS protection, CORS configuration, security headers, and audit logging.

## Components

### Core Middleware (`index.ts`)
- `SecurityMiddleware`: Main middleware class that orchestrates all security features
- `withSecurity()`: Convenience function to wrap API handlers with security
- `withSecurityPreset()`: Apply predefined security configurations

### Security Features (`security.ts`)
- Rate limiting with configurable windows and limits
- CORS header management with origin validation
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Request size validation
- Client identification for rate limiting

### Input Validation (`validation.ts`)
- XSS protection and HTML sanitization
- Input validation using Zod schemas
- File path validation (prevents directory traversal)
- API key format validation
- Request body size limits per endpoint

### Audit Logging (`audit.ts`)
- Comprehensive request/response logging
- Security event logging
- Tool execution audit trails
- Sensitive data sanitization
- Structured JSON log format

### Utilities (`utils.ts`)
- Helper functions for common security tasks
- Predefined security configuration presets
- Request/response helper functions
- Data masking utilities

## Quick Start

### 1. Basic Usage

```typescript
import { withSecurity } from '@/lib/middleware';

export const GET = withSecurity(async (request: NextRequest) => {
  // Your API logic here
  return NextResponse.json({ message: 'Hello, secure world!' });
});
```

### 2. Using Security Presets

```typescript
import { withSecurityPreset } from '@/lib/middleware';

// High security for sensitive operations
export const POST = withSecurityPreset(
  async (request: NextRequest) => {
    // Sensitive operation logic
    return NextResponse.json({ status: 'success' });
  },
  'HIGH_SECURITY'
);
```

### 3. Custom Security Configuration

```typescript
import { withSecurity } from '@/lib/middleware';

export const PUT = withSecurity(
  async (request: NextRequest) => {
    // API logic
    return NextResponse.json({ updated: true });
  },
  {
    enableRateLimit: true,
    enableCors: false, // Disable CORS for this endpoint
    enableSecurityHeaders: true,
    enableAuditLogging: true,
    enableInputValidation: true,
  }
);
```

### 4. Input Validation

```typescript
import { withSecurity, validateRequestBody, ValidationSchemas } from '@/lib/middleware';

export const POST = withSecurity(async (request: NextRequest) => {
  // Validate request body
  const validation = await validateRequestBody(request, ValidationSchemas.chatMessage);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data } = validation;
  // Process validated data
  return NextResponse.json({ processed: true });
});
```

## Security Presets

### HIGH_SECURITY
- All security features enabled
- Strict rate limiting
- Full audit logging
- Comprehensive input validation

### MEDIUM_SECURITY (Default)
- Balanced security and performance
- Standard rate limiting
- Essential security headers
- Basic input validation

### LOW_SECURITY
- Minimal security for public endpoints
- Relaxed rate limiting
- Basic security headers
- No audit logging

### NO_SECURITY
- For health checks and static content
- All security features disabled

## Configuration

### Rate Limiting
```typescript
const SECURITY_CONFIG = {
  rateLimiting: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // requests per window
  },
  // ... other config
};
```

### CORS
```typescript
const SECURITY_CONFIG = {
  cors: {
    allowedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  },
  // ... other config
};
```

### Content Security Policy
```typescript
const SECURITY_CONFIG = {
  security: {
    contentSecurityPolicy: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https://api.openai.com', 'https://api.deepseek.com'],
    },
  },
  // ... other config
};
```

## Validation Schemas

The middleware includes predefined Zod schemas for common data types:

- `chatMessage`: Chat message validation
- `llmProvider`: LLM provider configuration
- `mcpServer`: MCP server configuration
- `toolCall`: Tool execution requests
- `session`: Chat session data
- `preferences`: User preferences
- `exportRequest`: Data export requests

## Audit Logging

### Automatic Logging
- All API requests and responses
- Security events (rate limiting, validation failures)
- Tool executions
- Authentication failures

### Custom Logging
```typescript
import { logSecurityEvent, logApiCall } from '@/lib/middleware';

// Log custom security events
await logSecurityEvent('suspicious_activity', {
  reason: 'Multiple failed attempts',
  clientId: 'client-123',
}, request);

// Log API calls with custom data
await logApiCall(request, '/api/custom', {
  customField: 'value',
  timestamp: new Date().toISOString(),
});
```

### Log Format
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "event": "api_call",
  "details": {
    "endpoint": "/api/chat",
    "sessionId": "session-123"
  },
  "request": {
    "method": "POST",
    "url": "http://localhost:3000/api/chat",
    "userAgent": "Mozilla/5.0...",
    "ip": "192.168.1.1"
  },
  "response": {
    "status": 200,
    "duration": 150
  }
}
```

## Global Middleware

The security middleware can be applied globally using Next.js middleware:

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from '@/lib/middleware';

export async function middleware(request: NextRequest) {
  const securityResponse = await securityMiddleware.handle(request);
  if (securityResponse) {
    return securityResponse;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
```

## Testing

Run the security middleware tests:

```bash
npm test lib/middleware
```

The test suite covers:
- Rate limiting functionality
- Input validation and sanitization
- CORS header handling
- Security header configuration
- Audit logging
- Error handling

## Security Best Practices

1. **Always validate input**: Use the provided validation schemas or create custom ones
2. **Log security events**: Use audit logging for monitoring and incident response
3. **Apply appropriate security levels**: Use presets or custom configurations based on endpoint sensitivity
4. **Monitor rate limits**: Adjust limits based on usage patterns
5. **Review audit logs**: Regularly check logs for suspicious activity
6. **Keep dependencies updated**: Regularly update security-related packages
7. **Test security features**: Include security tests in your test suite

## Troubleshooting

### Rate Limiting Issues
- Check if client identification is working correctly
- Adjust rate limits based on legitimate usage patterns
- Monitor audit logs for rate limit violations

### CORS Issues
- Verify allowed origins configuration
- Check if preflight requests are handled correctly
- Ensure credentials are configured properly

### Validation Failures
- Check validation schemas match your data structure
- Review sanitization rules for false positives
- Monitor validation error logs

### Audit Log Issues
- Ensure log directory permissions are correct
- Check disk space for log storage
- Verify log rotation is working

## Contributing

When adding new security features:

1. Add comprehensive tests
2. Update documentation
3. Consider backward compatibility
4. Follow the existing code patterns
5. Add audit logging for new security events