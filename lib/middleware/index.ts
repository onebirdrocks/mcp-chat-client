import { NextRequest, NextResponse } from 'next/server';
import { 
  rateLimit, 
  getClientIdentifier, 
  setCorsHeaders, 
  setSecurityHeaders, 
  validateRequestSize 
} from './security';
import { InputValidator, ValidationSchemas, validateBodySize } from './validation';
import { 
  auditLogger, 
  logApiCall, 
  logApiResponse, 
  logSecurityEvent, 
  logRateLimit, 
  logValidationError,
  AuditLevel 
} from './audit';

// Security middleware configuration
export interface SecurityMiddlewareConfig {
  enableRateLimit?: boolean;
  enableCors?: boolean;
  enableSecurityHeaders?: boolean;
  enableAuditLogging?: boolean;
  enableInputValidation?: boolean;
  skipPaths?: string[];
}

// Default configuration
const DEFAULT_CONFIG: SecurityMiddlewareConfig = {
  enableRateLimit: true,
  enableCors: true,
  enableSecurityHeaders: true,
  enableAuditLogging: true,
  enableInputValidation: true,
  skipPaths: ['/api/health', '/_next', '/favicon.ico'],
};

// Security middleware class
export class SecurityMiddleware {
  private config: SecurityMiddlewareConfig;

  constructor(config: Partial<SecurityMiddlewareConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Check if path should be skipped
  private shouldSkipPath(pathname: string): boolean {
    return this.config.skipPaths?.some(skipPath => pathname.startsWith(skipPath)) || false;
  }

  // Main middleware function
  public async handle(request: NextRequest): Promise<NextResponse | null> {
    const startTime = Date.now();
    const pathname = new URL(request.url).pathname;

    // Skip middleware for certain paths
    if (this.shouldSkipPath(pathname)) {
      return null;
    }

    try {
      // Log API call
      if (this.config.enableAuditLogging) {
        await logApiCall(request, pathname);
      }

      // Validate request size
      const sizeValidation = validateRequestSize(request);
      if (!sizeValidation.valid) {
        if (this.config.enableAuditLogging) {
          await logValidationError(`Request size validation failed: ${sizeValidation.error}`, 'request_size', request);
        }
        return this.createErrorResponse('Request too large', 413, request);
      }

      // Rate limiting
      if (this.config.enableRateLimit) {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = rateLimit(clientId);
        
        if (!rateLimitResult.allowed) {
          if (this.config.enableAuditLogging) {
            await logRateLimit(clientId, pathname, request);
          }
          
          const response = this.createErrorResponse('Rate limit exceeded', 429, request);
          response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString());
          return response;
        }
      }

      // Input validation for POST/PUT requests
      if (this.config.enableInputValidation && ['POST', 'PUT'].includes(request.method)) {
        const validationResult = await this.validateRequestBody(request);
        if (!validationResult.valid) {
          if (this.config.enableAuditLogging) {
            await logValidationError(validationResult.error || 'Invalid request body', 'request_body', request);
          }
          return this.createErrorResponse(validationResult.error || 'Invalid request', 400, request);
        }
      }

      // Handle CORS preflight
      if (request.method === 'OPTIONS' && this.config.enableCors) {
        const response = new NextResponse(null, { status: 200 });
        setCorsHeaders(response, request.headers.get('origin') || undefined);
        return response;
      }

      return null; // Continue to next middleware/handler

    } catch (error) {
      if (this.config.enableAuditLogging) {
        await logSecurityEvent('middleware_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          pathname,
        }, request);
      }
      
      return this.createErrorResponse('Internal server error', 500, request);
    }
  }

  // Validate request body
  private async validateRequestBody(request: NextRequest): Promise<{ valid: boolean; error?: string }> {
    try {
      const pathname = new URL(request.url).pathname;
      const contentType = request.headers.get('content-type') || '';

      // Only validate JSON requests
      if (!contentType.includes('application/json')) {
        return { valid: true };
      }

      // Clone request to read body
      const body = await request.clone().text();
      
      // Validate body size
      if (!validateBodySize(body, pathname)) {
        return { valid: false, error: 'Request body too large for this endpoint' };
      }

      // Parse JSON
      let parsedBody;
      try {
        parsedBody = JSON.parse(body);
      } catch {
        return { valid: false, error: 'Invalid JSON format' };
      }

      // Sanitize input
      const sanitizedBody = InputValidator.sanitizeJson(parsedBody);

      // Endpoint-specific validation
      const validationResult = this.validateByEndpoint(pathname, sanitizedBody);
      if (!validationResult.valid) {
        return validationResult;
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, error: 'Request validation failed' };
    }
  }

  // Endpoint-specific validation
  private validateByEndpoint(pathname: string, body: any): { valid: boolean; error?: string } {
    try {
      if (pathname.startsWith('/api/chat')) {
        ValidationSchemas.chatMessage.parse(body);
      } else if (pathname.includes('/settings') && body.llmProviders) {
        body.llmProviders.forEach((provider: any) => {
          ValidationSchemas.llmProvider.parse(provider);
        });
      } else if (pathname.includes('/settings') && body.mcpServers) {
        body.mcpServers.forEach((server: any) => {
          ValidationSchemas.mcpServer.parse(server);
        });
      } else if (pathname.includes('/run-tool')) {
        ValidationSchemas.toolCall.parse(body.toolCall);
      } else if (pathname.includes('/sessions')) {
        if (body.title || body.provider || body.model) {
          ValidationSchemas.session.parse(body);
        }
      } else if (pathname.includes('/export')) {
        ValidationSchemas.exportRequest.parse(body);
      }

      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Validation failed' 
      };
    }
  }

  // Create error response with security headers
  private createErrorResponse(message: string, status: number, request: NextRequest): NextResponse {
    const response = NextResponse.json(
      { error: message, timestamp: new Date().toISOString() },
      { status }
    );

    // Add security headers
    if (this.config.enableSecurityHeaders) {
      setSecurityHeaders(response);
    }

    // Add CORS headers
    if (this.config.enableCors) {
      setCorsHeaders(response, request.headers.get('origin') || undefined);
    }

    return response;
  }

  // Wrap API handler with security middleware
  public wrapHandler(
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const startTime = Date.now();
      
      // Apply security middleware
      const middlewareResponse = await this.handle(request);
      if (middlewareResponse) {
        return middlewareResponse;
      }

      try {
        // Call the actual handler
        const response = await handler(request, context);
        
        // Add security headers to response
        if (this.config.enableSecurityHeaders) {
          setSecurityHeaders(response);
        }

        // Add CORS headers
        if (this.config.enableCors) {
          setCorsHeaders(response, request.headers.get('origin') || undefined);
        }

        // Log successful response
        if (this.config.enableAuditLogging) {
          const duration = Date.now() - startTime;
          await logApiResponse(request, response.status, duration);
        }

        return response;

      } catch (error) {
        // Log error
        if (this.config.enableAuditLogging) {
          await logSecurityEvent('handler_error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            pathname: new URL(request.url).pathname,
          }, request);
        }

        return this.createErrorResponse('Internal server error', 500, request);
      }
    };
  }
}

// Default security middleware instance
export const securityMiddleware = new SecurityMiddleware();

// Convenience function to wrap API handlers
export function withSecurity(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  config?: Partial<SecurityMiddlewareConfig>
) {
  const middleware = config ? new SecurityMiddleware(config) : securityMiddleware;
  return middleware.wrapHandler(handler);
}

// Export all middleware components
export * from './security';
export * from './validation';
export * from './audit';