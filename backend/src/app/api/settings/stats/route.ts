import { NextResponse } from 'next/server';
import { getSecureSettingsManager } from '@/services/SecureSettingsManager';
import { InternalServerError } from '@/lib/errors';

export const runtime = 'nodejs';

/**
 * GET /api/settings/stats - Get settings statistics
 */
export async function GET() {
  try {
    const settingsManager = getSecureSettingsManager();
    await settingsManager.initialize();
    
    const stats = settingsManager.getStatistics();
    
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Failed to get settings statistics:', error);
    
    if (error instanceof InternalServerError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve statistics' },
      { status: 500 }
    );
  }
}