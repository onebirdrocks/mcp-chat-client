import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { ValidationError } from '@/lib/errors';
import { getSessionManager } from '@/services/SessionManager';

async function importChatHistoryHandler(request: Request): Promise<NextResponse> {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body');
  }
  
  const { exportData, options = {} } = body;
  
  if (!exportData || !exportData.version || !exportData.sessions) {
    throw new ValidationError('Invalid chat history export format');
  }
  
  const sessionManager = getSessionManager();
  await sessionManager.initialize();
  
  const result = await sessionManager.importChatHistory(exportData, options);
  
  return NextResponse.json({
    success: true,
    ...result,
    message: `Successfully imported ${result.imported} sessions. ${result.skipped} sessions were skipped.`,
  });
}

export const POST = withSecurity(importChatHistoryHandler);
export const OPTIONS = withSecurity(async () => new NextResponse(null, { status: 200 }));