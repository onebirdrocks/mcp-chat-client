import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { ValidationError } from '@/lib/errors';
import { getSessionManager } from '@/services/SessionManager';
import { getSecureSettingsManager } from '@/services/SecureSettingsManager';

async function cleanupHandler(request: Request): Promise<NextResponse> {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body');
  }
  
  const { 
    type, 
    olderThanDays = 30, 
    sessionIds, 
    clearAllSensitiveData = false,
    clearApiKeys = false 
  } = body;
  
  if (!type || !['sessions', 'settings', 'all'].includes(type)) {
    throw new ValidationError('Type must be one of: sessions, settings, all');
  }
  
  const results: any = { success: true };
  
  // Clean up sessions
  if (type === 'sessions' || type === 'all') {
    const sessionManager = getSessionManager();
    await sessionManager.initialize();
    
    const sessionCleanup = await sessionManager.secureCleanup({
      olderThanDays,
      sessionIds,
      clearAllSensitiveData,
    });
    
    results.sessions = sessionCleanup;
  }
  
  // Clean up settings
  if (type === 'settings' || type === 'all') {
    if (clearApiKeys) {
      const settingsManager = getSecureSettingsManager();
      await settingsManager.initialize();
      
      await settingsManager.clearSensitiveData();
      results.settings = { clearedApiKeys: true };
    }
  }
  
  return NextResponse.json(results);
}

async function getPrivacyStatsHandler(request: Request): Promise<NextResponse> {
  const sessionManager = getSessionManager();
  await sessionManager.initialize();
  
  const settingsManager = getSecureSettingsManager();
  await settingsManager.initialize();
  
  const sessionStats = sessionManager.getPrivacyStatistics();
  const settingsStats = settingsManager.getStatistics();
  
  return NextResponse.json({
    sessions: sessionStats,
    settings: settingsStats,
  });
}

export const POST = withSecurity(cleanupHandler);
export const GET = withSecurity(getPrivacyStatsHandler);
export const OPTIONS = withSecurity(async () => new NextResponse(null, { status: 200 }));