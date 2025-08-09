import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir, writeFile, unlink, access } from 'fs/promises';
import { join } from 'path';
import { getSecureSettingsManager } from '../../../../backend/src/services/SecureSettingsManager';

export const runtime = 'nodejs';

interface CleanupRequest {
  type: 'sessions' | 'settings' | 'all';
  olderThan?: string; // ISO date string
  confirmed: boolean;
  options?: {
    keepRecentSessions?: number; // Keep N most recent sessions
    clearSensitiveData?: boolean; // Clear API keys and sensitive settings
    clearToolHistory?: boolean; // Clear tool execution history
  };
}

interface CleanupResponse {
  deletedCount: number;
  clearedData: string[];
  success: boolean;
  summary: {
    sessionsDeleted: number;
    settingsCleared: boolean;
    dataFreed: number; // bytes
  };
}

interface PrivacyReport {
  totalSessions: number;
  totalMessages: number;
  encryptedDataCount: number;
  lastCleanup?: string;
  recommendations: string[];
  dataBreakdown: {
    sessionData: number; // bytes
    settingsData: number; // bytes
    totalSize: number; // bytes
  };
}

/**
 * POST /api/privacy/cleanup - Perform privacy data cleanup
 */
export async function POST(request: NextRequest) {
  try {
    const body: CleanupRequest = await request.json();
    
    // Validate request
    if (!body.confirmed) {
      return NextResponse.json(
        { success: false, error: 'Cleanup must be explicitly confirmed' },
        { status: 400 }
      );
    }

    if (!['sessions', 'settings', 'all'].includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid cleanup type. Must be "sessions", "settings", or "all"' },
        { status: 400 }
      );
    }

    let deletedCount = 0;
    const clearedData: string[] = [];
    let dataFreed = 0;
    let sessionsDeleted = 0;
    let settingsCleared = false;

    // Clean up sessions
    if (body.type === 'sessions' || body.type === 'all') {
      const sessionCleanup = await cleanupSessions(body);
      deletedCount += sessionCleanup.deletedCount;
      dataFreed += sessionCleanup.dataFreed;
      sessionsDeleted = sessionCleanup.deletedCount;
      clearedData.push(...sessionCleanup.clearedData);
    }

    // Clean up settings
    if (body.type === 'settings' || body.type === 'all') {
      const settingsCleanup = await cleanupSettings(body);
      if (settingsCleanup.cleared) {
        settingsCleared = true;
        clearedData.push(...settingsCleanup.clearedData);
      }
    }

    // Record cleanup timestamp
    await recordCleanupTimestamp();

    const response: CleanupResponse = {
      deletedCount,
      clearedData,
      success: true,
      summary: {
        sessionsDeleted,
        settingsCleared,
        dataFreed
      }
    };

    return NextResponse.json({
      success: true,
      data: response,
      message: `Cleanup completed. ${deletedCount} items processed.`
    });

  } catch (error) {
    console.error('Failed to perform privacy cleanup:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform privacy cleanup' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/privacy/cleanup - Get privacy report and cleanup recommendations
 */
export async function GET() {
  try {
    const report = await generatePrivacyReport();
    
    return NextResponse.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Failed to generate privacy report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate privacy report' },
      { status: 500 }
    );
  }
}

// Helper functions

async function cleanupSessions(request: CleanupRequest): Promise<{
  deletedCount: number;
  dataFreed: number;
  clearedData: string[];
}> {
  const dataDir = join(process.cwd(), 'data', 'sessions');
  let deletedCount = 0;
  let dataFreed = 0;
  const clearedData: string[] = [];

  try {
    await access(dataDir);
  } catch {
    // No sessions directory
    return { deletedCount: 0, dataFreed: 0, clearedData: [] };
  }

  const files = await readdir(dataDir);
  const sessionFiles = files.filter(file => file.endsWith('.json'));

  // Sort sessions by date to keep recent ones if requested
  const sessionData: Array<{ file: string; createdAt: Date; size: number }> = [];
  
  for (const file of sessionFiles) {
    try {
      const filePath = join(dataDir, file);
      const fileContent = await readFile(filePath, 'utf-8');
      const stats = await import('fs').then(fs => fs.promises.stat(filePath));
      const session = JSON.parse(fileContent);
      
      sessionData.push({
        file,
        createdAt: new Date(session.createdAt || stats.mtime),
        size: stats.size
      });
    } catch (error) {
      console.warn(`Failed to read session ${file}:`, error);
    }
  }

  // Sort by creation date (newest first)
  sessionData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Determine which sessions to delete
  const sessionsToDelete: typeof sessionData = [];
  
  if (request.olderThan) {
    const cutoffDate = new Date(request.olderThan);
    sessionsToDelete.push(...sessionData.filter(s => s.createdAt < cutoffDate));
  } else if (request.options?.keepRecentSessions) {
    // Keep N most recent sessions, delete the rest
    sessionsToDelete.push(...sessionData.slice(request.options.keepRecentSessions));
  } else {
    // Delete all sessions
    sessionsToDelete.push(...sessionData);
  }

  // Delete sessions
  for (const session of sessionsToDelete) {
    try {
      const filePath = join(dataDir, session.file);
      await unlink(filePath);
      deletedCount++;
      dataFreed += session.size;
      clearedData.push(`Session: ${session.file.replace('.json', '')}`);
    } catch (error) {
      console.warn(`Failed to delete session ${session.file}:`, error);
    }
  }

  return { deletedCount, dataFreed, clearedData };
}

async function cleanupSettings(request: CleanupRequest): Promise<{
  cleared: boolean;
  clearedData: string[];
}> {
  const clearedData: string[] = [];
  let cleared = false;

  try {
    const settingsManager = getSecureSettingsManager();
    await settingsManager.initialize();

    if (request.options?.clearSensitiveData) {
      await settingsManager.clearSensitiveData();
      clearedData.push('API Keys and sensitive settings');
      cleared = true;
    }

    // Clear tool execution history if requested
    if (request.options?.clearToolHistory) {
      await clearToolExecutionHistory();
      clearedData.push('Tool execution history');
      cleared = true;
    }

    return { cleared, clearedData };
  } catch (error) {
    console.error('Failed to cleanup settings:', error);
    return { cleared: false, clearedData: [] };
  }
}

async function clearToolExecutionHistory(): Promise<void> {
  // This would clear tool execution logs if they exist
  // For now, this is a placeholder as tool execution history
  // is stored within session messages
  const dataDir = join(process.cwd(), 'data', 'sessions');
  
  try {
    await access(dataDir);
    const files = await readdir(dataDir);
    const sessionFiles = files.filter(file => file.endsWith('.json'));

    for (const file of sessionFiles) {
      try {
        const filePath = join(dataDir, file);
        const fileContent = await readFile(filePath, 'utf-8');
        const session = JSON.parse(fileContent);

        // Remove tool execution details from messages
        if (session.messages) {
          session.messages = session.messages.map((message: Record<string, unknown>) => {
            if (message.toolCalls) {
              message.toolCalls = (message.toolCalls as Record<string, unknown>[]).map((toolCall: Record<string, unknown>) => ({
                ...toolCall,
                result: undefined,
                executionTime: undefined,
                error: undefined
              }));
            }
            return message;
          });

          await writeFile(filePath, JSON.stringify(session, null, 2));
        }
      } catch (error) {
        console.warn(`Failed to clean tool history from ${file}:`, error);
      }
    }
  } catch (error) {
    console.warn('Failed to clear tool execution history:', error);
  }
}

async function recordCleanupTimestamp(): Promise<void> {
  try {
    const dataDir = join(process.cwd(), 'data');
    const cleanupFile = join(dataDir, 'last-cleanup.json');
    
    const cleanupRecord = {
      timestamp: new Date().toISOString(),
      type: 'privacy-cleanup'
    };

    await writeFile(cleanupFile, JSON.stringify(cleanupRecord, null, 2));
  } catch (error) {
    console.warn('Failed to record cleanup timestamp:', error);
  }
}

async function generatePrivacyReport(): Promise<PrivacyReport> {
  let totalSessions = 0;
  let totalMessages = 0;
  let sessionDataSize = 0;
  let settingsDataSize = 0;
  let encryptedDataCount = 0;
  let lastCleanup: string | undefined;

  // Analyze session data
  const sessionsDir = join(process.cwd(), 'data', 'sessions');
  try {
    await access(sessionsDir);
    const files = await readdir(sessionsDir);
    const sessionFiles = files.filter(file => file.endsWith('.json'));
    totalSessions = sessionFiles.length;

    for (const file of sessionFiles) {
      try {
        const filePath = join(sessionsDir, file);
        const stats = await import('fs').then(fs => fs.promises.stat(filePath));
        const fileContent = await readFile(filePath, 'utf-8');
        const session = JSON.parse(fileContent);
        
        sessionDataSize += stats.size;
        totalMessages += session.messages?.length || 0;
      } catch (error) {
        console.warn(`Failed to analyze session ${file}:`, error);
      }
    }
  } catch {
    // No sessions directory
  }

  // Analyze settings data
  const settingsDir = join(process.cwd(), 'data', 'settings');
  try {
    await access(settingsDir);
    const settingsFile = join(settingsDir, 'settings.json');
    const stats = await import('fs').then(fs => fs.promises.stat(settingsFile));
    const fileContent = await readFile(settingsFile, 'utf-8');
    const settings = JSON.parse(fileContent);
    
    settingsDataSize = stats.size;
    
    // Count encrypted data (API keys)
    if (settings.llmProviders) {
      encryptedDataCount = (settings.llmProviders as Record<string, unknown>[]).filter((p: Record<string, unknown>) => p.apiKey).length;
    }
  } catch {
    // No settings file
  }

  // Check last cleanup
  try {
    const cleanupFile = join(process.cwd(), 'data', 'last-cleanup.json');
    const cleanupContent = await readFile(cleanupFile, 'utf-8');
    const cleanup = JSON.parse(cleanupContent);
    lastCleanup = cleanup.timestamp;
  } catch {
    // No cleanup record
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (totalSessions > 50) {
    recommendations.push('Consider cleaning up old chat sessions to free up space');
  }
  
  if (totalMessages > 1000) {
    recommendations.push('Large number of messages stored - consider archiving old conversations');
  }
  
  if (encryptedDataCount > 0) {
    recommendations.push('API keys are encrypted and stored securely');
  }
  
  if (!lastCleanup) {
    recommendations.push('No previous cleanup detected - consider running a privacy cleanup');
  } else {
    const daysSinceCleanup = Math.floor((Date.now() - new Date(lastCleanup).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCleanup > 30) {
      recommendations.push(`Last cleanup was ${daysSinceCleanup} days ago - consider running another cleanup`);
    }
  }

  return {
    totalSessions,
    totalMessages,
    encryptedDataCount,
    lastCleanup,
    recommendations,
    dataBreakdown: {
      sessionData: sessionDataSize,
      settingsData: settingsDataSize,
      totalSize: sessionDataSize + settingsDataSize
    }
  };
}