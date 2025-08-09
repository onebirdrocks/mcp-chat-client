import { NextRequest, NextResponse } from 'next/server';
import { getSecureSettingsManager } from '@/services/SecureSettingsManager';
import { validateSettings } from '@/lib/validation';
import { ValidationError, InternalServerError } from '@/lib/errors';

export const runtime = 'nodejs';

/**
 * GET /api/settings - Get current settings with masked API keys
 */
export async function GET() {
  try {
    const settingsManager = getSecureSettingsManager();
    await settingsManager.initialize();
    
    const settings = await settingsManager.getSettings();
    
    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Failed to get settings:', error);
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings - Update settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedSettings = validateSettings(body);
    
    const settingsManager = getSecureSettingsManager();
    await settingsManager.initialize();
    
    const updatedSettings = await settingsManager.updateSettings(validatedSettings);
    
    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Failed to update settings:', error);
    
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
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings - Clear sensitive data
 */
export async function DELETE() {
  try {
    const settingsManager = getSecureSettingsManager();
    await settingsManager.initialize();
    
    await settingsManager.clearSensitiveData();
    
    return NextResponse.json({
      success: true,
      message: 'Sensitive data cleared successfully',
    });
  } catch (error) {
    console.error('Failed to clear sensitive data:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to clear sensitive data' },
      { status: 500 }
    );
  }
}