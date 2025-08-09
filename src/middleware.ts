import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from '../lib/middleware';

export async function middleware(request: NextRequest) {
  // Apply security middleware
  const securityResponse = await securityMiddleware.handle(request);
  
  if (securityResponse) {
    return securityResponse;
  }

  // Continue to the next middleware or route handler
  return NextResponse.next();
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