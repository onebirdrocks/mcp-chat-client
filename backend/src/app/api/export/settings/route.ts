import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { getSecureSettingsManager } from '@/services/SecureSettingsManager';

async function exportSettingsHandler(request: Request): Promise<NextResponse> {
  const settingsManager = getSecureSettingsManager();
  await settingsManager.initialize();
  
  const exportData = await settingsManager.exportSettings();
  
  // Set headers for file download
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Content-Disposition', `attachment; filename="mcp-chat-settings-${new Date().toISOString().split('T')[0]}.json"`);
  
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers,
  });
}

export const GET = withSecurity(exportSettingsHandler);
export const OPTIONS = withSecurity(async () => new NextResponse(null, { status: 200 }));