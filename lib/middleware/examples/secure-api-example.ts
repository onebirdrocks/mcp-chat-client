import { NextRequest, NextResponse } from 'next/server';
import { 
  withSecurity, 
  withSecurityPreset, 
  SECURITY_PRESETS,
  createSecureHandler,
  validateRequestBody,
  createErrorResponse,
  createSuccessResponse 
} from '../index';
import { ValidationSchemas } from '../validation';
import { logApiCall, logSecurityEvent } from '../audit';

// Example 1: Basic secure API handler
export const basicSecureHandler = withSecurity(async (request: NextRequest) => {
  try {
    // Your API logic here
    const data = { message: 'Hello, secure world!' };
    return createSuccessResponse(data);
  } catch (error) {
    return createErrorResponse('Internal server error', 500);
  }
});

// Example 2: Using security presets
export const highSecurityHandler = withSecurityPreset(
  async (request: NextRequest) => {
    // High security endpoint logic
    return createSuccessResponse({ status: 'secure' });
  },
  'HIGH_SECURITY'
);

// Example 3: Custom security configuration
export const customSecurityHandler = withSecurity(
  async (request: NextRequest) => {
    // Custom logic
    return createSuccessResponse({ status: 'custom' });
  },
  {
    enableRateLimit: true,
    enableCors: false, // Disable CORS for this endpoint
    enableSecurityHeaders: true,
    enableAuditLogging: true,
    enableInputValidation: true,
  }
);

// Example 4: Secure handler with input validation
export const validatedHandler = createSecureHandler(async (request: NextRequest) => {
  if (request.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  // Validate request body
  const validation = await validateRequestBody(request, ValidationSchemas.chatMessage);
  if (!validation.success) {
    return createErrorResponse(validation.error, 400);
  }

  const { data } = validation;

  // Process validated data
  const result = {
    id: crypto.randomUUID(),
    content: data.content,
    role: data.role,
    timestamp: new Date().toISOString(),
  };

  return createSuccessResponse(result, 201);
});

// Example 5: Handler with custom audit logging
export const auditedHandler = withSecurity(async (request: NextRequest) => {
  try {
    // Log the API call with custom details
    await logApiCall(request, '/api/example', {
      customField: 'value',
      timestamp: new Date().toISOString(),
    });

    // Your business logic
    const result = { processed: true };

    // Log successful processing
    await logSecurityEvent('data_processed', {
      recordCount: 1,
      processingTime: Date.now(),
    }, request);

    return createSuccessResponse(result);

  } catch (error) {
    // Log the error
    await logSecurityEvent('processing_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    }, request);

    return createErrorResponse('Processing failed', 500);
  }
});

// Example 6: Multi-method handler with different security levels
export const multiMethodHandler = async (request: NextRequest) => {
  switch (request.method) {
    case 'GET':
      // Low security for read operations
      return withSecurityPreset(
        async (req) => createSuccessResponse({ data: 'read data' }),
        'LOW_SECURITY'
      )(request);

    case 'POST':
    case 'PUT':
    case 'DELETE':
      // High security for write operations
      return withSecurityPreset(
        async (req) => {
          const validation = await validateRequestBody(req, ValidationSchemas.chatMessage);
          if (!validation.success) {
            return createErrorResponse(validation.error, 400);
          }
          return createSuccessResponse({ data: 'write operation completed' });
        },
        'HIGH_SECURITY'
      )(request);

    default:
      return createErrorResponse('Method not allowed', 405);
  }
};

// Example 7: Handler with session validation
export const sessionValidatedHandler = withSecurity(async (request: NextRequest) => {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId || !ValidationSchemas.session.shape.id.safeParse(sessionId).success) {
    await logSecurityEvent('invalid_session_id', { sessionId }, request);
    return createErrorResponse('Invalid session ID', 400);
  }

  // Process with valid session
  return createSuccessResponse({ sessionId, status: 'valid' });
});

// Example 8: File upload handler with security
export const fileUploadHandler = withSecurity(
  async (request: NextRequest) => {
    if (request.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405);
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return createErrorResponse('No file provided', 400);
      }

      // Validate file type and size
      const allowedTypes = ['text/plain', 'application/json'];
      if (!allowedTypes.includes(file.type)) {
        await logSecurityEvent('invalid_file_type', { 
          fileType: file.type,
          fileName: file.name 
        }, request);
        return createErrorResponse('Invalid file type', 400);
      }

      if (file.size > 1024 * 1024) { // 1MB limit
        await logSecurityEvent('file_too_large', { 
          fileSize: file.size,
          fileName: file.name 
        }, request);
        return createErrorResponse('File too large', 400);
      }

      // Process file
      const content = await file.text();
      
      return createSuccessResponse({
        fileName: file.name,
        size: file.size,
        processed: true,
      });

    } catch (error) {
      return createErrorResponse('File processing failed', 500);
    }
  },
  {
    enableRateLimit: true,
    enableCors: true,
    enableSecurityHeaders: true,
    enableAuditLogging: true,
    enableInputValidation: false, // Custom validation for file uploads
  }
);