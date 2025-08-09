# Security Features

This document outlines the comprehensive security features implemented in the MCP Chat UI backend to ensure data privacy and protection against common web vulnerabilities.

## Overview

The security implementation follows a defense-in-depth approach with multiple layers of protection:

1. **Secure Storage** - Encrypted API keys and secure session management
2. **Input Validation** - Comprehensive validation and sanitization
3. **Rate Limiting** - Protection against abuse and DoS attacks
4. **Security Headers** - HTTP security headers to prevent common attacks
5. **CORS Configuration** - Proper cross-origin resource sharing setup

## Secure Storage

### API Key Encryption

- **Encryption**: API keys are encrypted using AES encryption before storage
- **Key Management**: Encryption keys are stored in environment variables
- **Masking**: API keys are masked in frontend displays (showing only last 4 characters)
- **Validation**: API keys are validated for format and provider-specific requirements

```typescript
// Example: API key is encrypted before storage
const encryptedKey = encryptionService.encrypt(apiKey);
```

### Session Security

- **Secure Storage**: Sessions are stored locally with proper cleanup mechanisms
- **Data Sanitization**: Sensitive data is automatically sanitized from session content
- **Export/Import**: Secure data export functionality excludes sensitive information
- **Cleanup**: Automatic and manual cleanup of old sessions and sensitive data

### Environment Configuration

Required environment variables for security:

```bash
# Encryption key for API key storage (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your-secure-encryption-key-here

# Security headers (default: enabled)
SECURITY_HEADERS_ENABLED=true

# Rate limiting configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

## Input Validation and Sanitization

### XSS Prevention

All user inputs are sanitized to prevent Cross-Site Scripting attacks:

- Script tag removal: `<script>`, `<iframe>`, `<object>`, `<embed>`
- Protocol filtering: `javascript:`, `vbscript:`, `data:text/html`
- Event handler removal: `onclick`, `onload`, etc.
- Style expression filtering: CSS expressions

### Input Validation

Comprehensive validation for all data types:

- **Message IDs**: Alphanumeric with hyphens/underscores only
- **Session IDs**: Format validation and length limits
- **API Keys**: Provider-specific format validation
- **URLs**: Protocol validation (HTTP/HTTPS only)
- **JSON**: Size limits and format validation

### SQL Injection Prevention

- No direct SQL queries (file-based storage)
- JSON schema validation
- Parameter sanitization

## Rate Limiting

### Configuration

- **Window**: 15 minutes (configurable)
- **Limit**: 100 requests per window (configurable)
- **Identifier**: Client IP address
- **Headers**: Standard rate limit headers included

### Implementation

```typescript
// Rate limiting is applied automatically to all API routes
export const POST = withSecurity(handler);
```

### Response Headers

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds to wait before retrying (when limited)

## Security Headers

### HTTP Security Headers

All API responses include comprehensive security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'none'; frame-ancestors 'none';
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### HTTPS Enforcement (Production)

In production environments:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

## CORS Configuration

### Development

- Allows localhost with common development ports
- Automatic origin detection for development servers

### Production

- Strict origin validation
- Configurable allowed origins
- Credentials support for authenticated requests

## API Security

### Request Validation

- Content-Type validation for POST/PUT requests
- Content-Length limits (1MB default)
- Suspicious header detection
- URL path validation

### Response Security

- Server header removal
- Error message sanitization
- Consistent error response format

## Data Privacy

### Local-First Architecture

- All processing occurs locally
- No external data transmission except LLM API calls
- User controls all data retention and deletion

### Data Export/Import

- **Export**: Excludes sensitive data (API keys, tokens)
- **Import**: Requires re-entry of sensitive credentials
- **Format**: Structured JSON with version control

### Cleanup Features

- **Automatic**: Scheduled cleanup of old sessions
- **Manual**: User-initiated cleanup with options
- **Secure**: Permanent deletion with sensitive data sanitization

## Monitoring and Logging

### Security Event Logging

- Suspicious request patterns
- Rate limit violations
- Validation failures
- Authentication issues

### Log Levels

- **High**: Critical security events (logged as errors)
- **Medium**: Security warnings (logged as warnings)
- **Low**: Informational security events (logged as info)

## Best Practices

### For Developers

1. **Always use the security middleware**: `withSecurity(handler)`
2. **Validate all inputs**: Use provided validation functions
3. **Sanitize outputs**: Especially user-generated content
4. **Handle errors securely**: Don't expose internal details
5. **Log security events**: Use the provided logging functions

### For Deployment

1. **Set strong encryption keys**: Use `openssl rand -hex 32`
2. **Enable HTTPS**: Required for production
3. **Configure rate limits**: Adjust based on expected usage
4. **Monitor logs**: Set up log monitoring and alerting
5. **Regular updates**: Keep dependencies updated

## Testing

### Security Test Coverage

- Input validation and sanitization
- Encryption/decryption functionality
- Rate limiting behavior
- Security header presence
- XSS prevention

### Running Security Tests

```bash
# Run all security tests
npm test -- src/lib/__tests__/security.test.ts

# Run validation tests
npm test -- src/lib/__tests__/validation.test.ts
```

## Compliance

### Standards Followed

- **OWASP Top 10**: Protection against common web vulnerabilities
- **GDPR**: Data privacy and user control principles
- **Security Headers**: Industry standard HTTP security headers
- **Input Validation**: Comprehensive validation and sanitization

### Security Checklist

- [x] Input validation and sanitization
- [x] XSS prevention
- [x] CSRF protection (via CORS)
- [x] Rate limiting
- [x] Secure headers
- [x] Encryption at rest
- [x] Secure session management
- [x] Error handling
- [x] Logging and monitoring
- [x] Data privacy controls

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do not** create a public issue
2. Email security concerns to the maintainers
3. Provide detailed information about the vulnerability
4. Allow time for the issue to be addressed before disclosure

## Updates and Maintenance

- Security features are regularly reviewed and updated
- Dependencies are monitored for vulnerabilities
- Security tests are run on every deployment
- Documentation is kept current with implementation