import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { ValidationError } from '@/lib/errors';
import { getSecureSettingsManager } from '@/services/SecureSettingsManager';

async function importSettingsHandler(request: Request): Promise<NextResponse> {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body');
  }
  
  if (!body.version || !body.settings) {
    throw new ValidationError('Invalid settings export format');
  }
  
  const settingsManager = getSecureSettingsManager();
  await settingsManager.initialize();
  
  await settingsManager.importSettings(body);
  
  return NextResponse.json({ 
    success: true, 
    message: 'Settings imported successfully. Please re-enter your API keys.' 
  });
}

export const POST = withSecurity(importSettingsHandler);
export const OPTIONS = withSecurity(async () => new NextResponse(null, { status: 200 }));