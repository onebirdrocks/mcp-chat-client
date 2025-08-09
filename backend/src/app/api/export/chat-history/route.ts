import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { ValidationError } from '@/lib/errors';
import { getSessionManager } from '@/services/SessionManager';

async function exportChatHistoryHandler(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const sessionIds = url.searchParams.get('sessionIds')?.split(',').filter(Boolean);
  const dateFrom = url.searchParams.get('dateFrom') ? new Date(url.searchParams.get('dateFrom')!) : undefined;
  const dateTo = url.searchParams.get('dateTo') ? new Date(url.searchParams.get('dateTo')!) : undefined;
  const includeSystemMessages = url.searchParams.get('includeSystemMessages') === 'true';
  
  // Validate dates
  if (dateFrom && isNaN(dateFrom.getTime())) {
    throw new ValidationError('Invalid dateFrom parameter');
  }
  
  if (dateTo && isNaN(dateTo.getTime())) {
    throw new ValidationError('Invalid dateTo parameter');
  }
  
  const sessionManager = getSessionManager();
  await sessionManager.initialize();
  
  const exportData = await sessionManager.exportChatHistory({
    sessionIds,
    dateFrom,
    dateTo,
    includeSystemMessages,
  });
  
  // Set headers for file download
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Content-Disposition', `attachment; filename="mcp-chat-history-${new Date().toISOString().split('T')[0]}.json"`);
  
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers,
  });
}

export const GET = withSecurity(exportChatHistoryHandler);
export const OPTIONS = withSecurity(async () => new NextResponse(null, { status: 200 }));