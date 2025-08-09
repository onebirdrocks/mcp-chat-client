import { NextResponse } from 'next/server';
import { getSecureSettingsManager } from '@/services/SecureSettingsManager';
import { InternalServerError } from '@/lib/errors';

export const runtime = 'nodejs';

/**
 * GET /api/settings/export - Export settings (excluding sensitive data)
 */
export async function GET() {
  try {
    const settingsManager = getSecureSettingsManager();
    await settingsManager.initialize();
    
    const exportData = await settingsManager.exportSettings();
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `mcp-chat-ui-settings-${timestamp}.json`;
    
    return NextResponse.json({
      success: true,
      data: exportData,
      filename,
      message: 'Settings exported successfully',
    });
  } catch (error) {
    console.error('Failed to export settings:', error);
    
    if (error instanceof InternalServerError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to export settings' },
      { status: 500 }
    );
  }
}