import { NextRequest, NextResponse } from 'next/server';

// Development: Allow localhost with any port
// Production: Use specific allowed origins
const isDevelopment = process.env.NODE_ENV !== 'production';

const LOCALHOST_PATTERN = /^http:\/\/localhost:\d+$/;
const ALLOWED_PORTS = [3000, 4173, 5173, 5174, 5175, 5176, 5177, 5178, 5179, 8080]; // Common dev ports

const PRODUCTION_ORIGINS = [
  'https://your-domain.com', // Add your production domain here
];

export function corsHeaders(origin?: string) {
  let allowedOrigin: string;
  
  console.log('🔍 CORS Debug - Received origin:', origin, 'isDevelopment:', isDevelopment);
  
  if (isDevelopment) {
    // In development, always use the provided origin if it's localhost
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      allowedOrigin = origin;
      console.log('✅ CORS Debug - Using provided localhost origin:', allowedOrigin);
    } else if (origin) {
      // For any other origin in development, still allow it
      allowedOrigin = origin;
      console.log('✅ CORS Debug - Using provided origin:', allowedOrigin);
    } else {
      // No origin provided, use wildcard for development
      allowedOrigin = '*';
      console.log('⚠️ CORS Debug - No origin provided, using wildcard for development');
    }
  } else {
    // In production, use strict origin checking
    if (origin && PRODUCTION_ORIGINS.includes(origin)) {
      allowedOrigin = origin;
    } else {
      allowedOrigin = PRODUCTION_ORIGINS[0] || 'http://localhost:5173';
    }
  }
  
  const headers: Record<string, string> = {
    // CORS headers
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };

  // Add security headers if enabled
  if (process.env.SECURITY_HEADERS_ENABLED !== 'false') {
    Object.assign(headers, getSecurityHeaders());
  }

  return headers;
}

export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent XSS attacks
    'X-XSS-Protection': '1; mode=block',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Content Security Policy (restrictive for API)
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",
    
    // Permissions policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    
    // HSTS (only in production with HTTPS)
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),
  };
}

export function handleCors(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin');
  return corsHeaders(origin || undefined);
}

export function withCors(handler: (request: Request, context?: any) => Promise<NextResponse>) {
  return async (request: Request, context?: any) => {
    // Convert Request to NextRequest for CORS handling
    const nextRequest = request as NextRequest;
    const corsHeadersObj = handleCors(nextRequest);
    
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: corsHeadersObj });
    }

    try {
      const response = await handler(request, context);
      
      // Add CORS headers to the response
      Object.entries(corsHeadersObj).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('CORS Handler Error:', error);
      
      // Return proper JSON error response
      const statusCode = error instanceof Error && 'statusCode' in error ? 
        (error as any).statusCode : 500;
      const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
      
      const response = NextResponse.json(
        {
          error: error instanceof Error ? error.name : 'Error',
          message: errorMessage,
          statusCode,
        },
        { status: statusCode }
      );
      
      // Add CORS headers to error response
      Object.entries(corsHeadersObj).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
    }
  };
}