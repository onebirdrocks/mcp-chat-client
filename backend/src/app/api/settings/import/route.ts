import { NextRequest, NextResponse } from 'next/server';
import { getSecureSettingsManager } from '@/services/SecureSettingsManager';
import { ValidationError, InternalServerError } from '@/lib/errors';

export const runtime = 'nodejs';

/**
 * POST /api/settings/import - Import settings from backup
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid import data format' },
        { status: 400 }
      );
    }

    // Basic validation of export format
    if (!body.version || !body.settings) {
      return NextResponse.json(
        { success: false, error: 'Invalid export file format' },
        { status: 400 }
      );
    }

    const settingsManager = getSecureSettingsManager();
    await settingsManager.initialize();
    
    await settingsManager.importSettings(body);
    
    return NextResponse.json({
      success: true,
      message: 'Settings imported successfully',
      note: 'API keys were not imported for security reasons. Please re-enter them in the settings.',
    });
  } catch (error) {
    console.error('Failed to import settings:', error);
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    if (error instanceof InternalServerError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to import settings' },
      { status: 500 }
    );
  }
}