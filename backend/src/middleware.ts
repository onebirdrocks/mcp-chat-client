import { NextRequest, NextResponse } from 'next/server';
import { getSecurityHeaders } from '@/lib/cors';

export function middleware(request: NextRequest) {
  // Apply security headers to all responses
  const response = NextResponse.next();
  
  // Add security headers if enabled
  if (process.env.SECURITY_HEADERS_ENABLED !== 'false') {
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  // Log security-relevant requests in production
  if (process.env.NODE_ENV === 'production') {
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               request.ip || 'unknown';
    
    // Log suspicious patterns
    const suspiciousPatterns = [
      /\.\./,  // Path traversal
      /<script/i,  // XSS attempts
      /union.*select/i,  // SQL injection
      /javascript:/i,  // JavaScript protocol
    ];
    
    const url = request.url;
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));
    
    if (isSuspicious) {
      console.warn(`🚨 Suspicious request detected:`, {
        url,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};