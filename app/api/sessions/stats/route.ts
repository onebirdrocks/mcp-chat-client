import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '../../../../backend/src/services/SessionManager';

export const runtime = 'nodejs';

/**
 * GET /api/sessions/stats - Get session statistics
 */
export async function GET() {
  try {
    const sessionManager = getSessionManager();
    await sessionManager.initialize();
    
    const stats = sessionManager.getStatistics();
    const privacyStats = sessionManager.getPrivacyStatistics();
    
    return NextResponse.json({
      success: true,
      data: {
        sessions: {
          total: stats.totalSessions,
          lastCleanup: stats.lastCleanup,
          providerBreakdown: stats.providerBreakdown,
          averageMessagesPerSession: Math.round(stats.averageMessagesPerSession * 100) / 100,
        },
        privacy: {
          totalMessages: privacyStats.totalMessages,
          oldestSession: privacyStats.oldestSession,
          newestSession: privacyStats.newestSession,
          averageSessionAge: Math.round(privacyStats.averageSessionAge * 100) / 100,
          sessionsWithSensitiveData: privacyStats.sessionsWithSensitiveData,
          lastCleanup: privacyStats.lastCleanup,
        },
      },
    });
    
  } catch (error) {
    console.error('Failed to get session statistics:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve session statistics' },
      { status: 500 }
    );
  }
}