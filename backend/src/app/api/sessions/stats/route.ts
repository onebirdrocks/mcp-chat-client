import { NextResponse } from 'next/server';
import { withCors } from '@/lib/cors';
import { handleAsyncRoute } from '@/lib/errors';
import { getSessionManager } from '@/services/SessionManager';
import { ensureInitialized } from '@/lib/startup';

async function getStatsHandler(request: Request): Promise<NextResponse> {
  await ensureInitialized();
  
  const sessionManager = getSessionManager();
  const stats = sessionManager.getStatistics();

  return NextResponse.json(stats);
}

async function cleanupHandler(request: Request): Promise<NextResponse> {
  await ensureInitialized();
  
  const sessionManager = getSessionManager();
  const result = await sessionManager.cleanupSessions();

  return NextResponse.json({
    success: true,
    deletedCount: result.deletedCount,
    message: `Cleaned up ${result.deletedCount} old sessions`,
  });
}

export const GET = withCors(handleAsyncRoute(getStatsHandler));
export const POST = withCors(handleAsyncRoute(cleanupHandler));
export const OPTIONS = withCors(async () => new NextResponse(null, { status: 200 }));