import { NextRequest, NextResponse } from 'next/server';

// Rate limiting store (in-memory for single-user deployment)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Simple rate limiting function
function rateLimit(clientId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100; // requests per window
  
  const record = rateLimitStore.get(clientId);
  
  if (!record || now > record.resetTime) {
    // New window or expired window
    rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }
  
  record.count++;
  return { allowed: true };
}

// Get client identifier
function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || request.ip || 'unknown';
  return ip;
}

// Set security headers
function setSecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
  );
}

// Set CORS headers
function setCorsHeaders(response: NextResponse): void {
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
}

export async function middleware(request: NextRequest) {
  try {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      setCorsHeaders(response);
      return response;
    }
    
    // Apply basic security headers
    const response = NextResponse.next();
    setSecurityHeaders(response);
    
    // Set CORS headers for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      setCorsHeaders(response);
      
      // Apply rate limiting
      const clientId = getClientIdentifier(request);
      const rateLimitResult = rateLimit(clientId);
      
      if (!rateLimitResult.allowed) {
        return new NextResponse('Rate limit exceeded', { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        });
      }
      
      // Validate request size (basic check)
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
        return new NextResponse('Request too large', { status: 413 });
      }
    }
    
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};