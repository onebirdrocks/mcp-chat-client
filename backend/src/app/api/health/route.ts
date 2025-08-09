import { NextResponse } from 'next/server';
import { withCors } from '@/lib/cors';

interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    api: 'healthy' | 'unhealthy';
    database: 'healthy' | 'unhealthy' | 'not_configured';
    mcp: 'healthy' | 'unhealthy' | 'not_configured';
  };
}

async function healthHandler(request: Request): Promise<NextResponse> {
  const startTime = process.hrtime.bigint();
  
  try {
    // Check various service health
    const services = {
      api: 'healthy' as const,
      database: 'not_configured' as const, // Will be 'healthy' when database is implemented
      mcp: 'not_configured' as const, // Will be 'healthy' when MCP integration is implemented
    };

    const response: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      services,
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorResponse: HealthResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      services: {
        api: 'unhealthy',
        database: 'not_configured',
        mcp: 'not_configured',
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export const GET = withCors(healthHandler);
export const OPTIONS = withCors(async () => new NextResponse(null, { status: 200 }));