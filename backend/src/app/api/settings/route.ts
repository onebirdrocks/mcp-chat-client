import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { ValidationError } from '@/lib/errors';
import { validateSettings } from '@/lib/validation';
import { getSecureSettingsManager } from '@/services/SecureSettingsManager';

async function getSettingsHandler(request: Request): Promise<NextResponse> {
  const settingsManager = getSecureSettingsManager();
  await settingsManager.initialize();
  
  const settings = await settingsManager.getSettings();
  return NextResponse.json(settings);
}

async function updateSettingsHandler(request: Request): Promise<NextResponse> {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body');
  }
  
  const validatedSettings = validateSettings(body);
  
  const settingsManager = getSecureSettingsManager();
  await settingsManager.initialize();
  
  const updatedSettings = await settingsManager.updateSettings(validatedSettings);
  return NextResponse.json(updatedSettings);
}

async function settingsHandler(request: Request): Promise<NextResponse> {
  switch (request.method) {
    case 'GET':
      return getSettingsHandler(request);
    case 'POST':
    case 'PUT':
      return updateSettingsHandler(request);
    default:
      return NextResponse.json(
        { error: 'Method not allowed', message: 'Only GET, POST, and PUT methods are allowed' },
        { status: 405 }
      );
  }
}

export const GET = withSecurity(getSettingsHandler);
export const POST = withSecurity(updateSettingsHandler);
export const PUT = withSecurity(updateSettingsHandler);
export const OPTIONS = withSecurity(async () => new NextResponse(null, { status: 200 }));