import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir, access } from 'fs/promises';
import { join } from 'path';
import { ChatSession, Message } from '../../../../lib/types';

export const runtime = 'nodejs';

interface ExportRequest {
  sessionIds?: string[];
  format: 'json' | 'markdown';
  includeSensitiveData?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface ExportResponse {
  data: string;
  filename: string;
  contentType: string;
  sessionCount: number;
  messageCount: number;
}

/**
 * POST /api/export/chat-history - Export chat history data
 * Supports JSON and Markdown formats with privacy controls
 */
export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    
    // Validate request
    if (!body.format || !['json', 'markdown'].includes(body.format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format. Must be "json" or "markdown"' },
        { status: 400 }
      );
    }

    const dataDir = join(process.cwd(), 'data', 'sessions');
    
    // Check if data directory exists
    try {
      await access(dataDir);
    } catch {
      return NextResponse.json(
        { success: false, error: 'No chat history data found' },
        { status: 404 }
      );
    }

    // Get session files
    const files = await readdir(dataDir);
    const sessionFiles = files.filter(file => file.endsWith('.json'));
    
    const sessionsToExport: ChatSession[] = [];
    let totalMessageCount = 0;

    // Load sessions
    for (const file of sessionFiles) {
      try {
        const sessionId = file.replace('.json', '');
        
        // Filter by sessionIds if specified
        if (body.sessionIds && !body.sessionIds.includes(sessionId)) {
          continue;
        }

        const filePath = join(dataDir, file);
        const fileContent = await readFile(filePath, 'utf-8');
        const sessionData = JSON.parse(fileContent);

        // Convert to ChatSession format
        const session: ChatSession = {
          id: sessionData.id || sessionId,
          title: sessionData.title || 'Untitled Session',
          messages: sessionData.messages || [],
          createdAt: new Date(sessionData.createdAt || new Date()),
          updatedAt: new Date(sessionData.updatedAt || new Date()),
          provider: sessionData.provider || 'unknown',
          model: sessionData.model || 'unknown',
          mcpServers: sessionData.mcpServers || [],
          totalTokens: sessionData.totalTokens || 0,
          estimatedCost: sessionData.estimatedCost || 0
        };

        // Filter by date range if specified
        if (body.dateRange) {
          const sessionDate = new Date(session.createdAt);
          const startDate = new Date(body.dateRange.start);
          const endDate = new Date(body.dateRange.end);
          
          if (sessionDate < startDate || sessionDate > endDate) {
            continue;
          }
        }

        // Sanitize sensitive data if not explicitly included
        if (!body.includeSensitiveData) {
          session.messages = session.messages.map(message => sanitizeMessage(message));
        }

        sessionsToExport.push(session);
        totalMessageCount += session.messages.length;
      } catch (error) {
        console.warn(`Failed to load session ${file}:`, error);
      }
    }

    if (sessionsToExport.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No sessions found matching the criteria' },
        { status: 404 }
      );
    }

    // Sort sessions by creation date
    sessionsToExport.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Generate export data
    const timestamp = new Date().toISOString().split('T')[0];
    let exportData: string;
    let filename: string;
    let contentType: string;

    if (body.format === 'json') {
      const exportObject = {
        exportInfo: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          sessionCount: sessionsToExport.length,
          messageCount: totalMessageCount,
          includeSensitiveData: body.includeSensitiveData || false
        },
        sessions: sessionsToExport
      };
      
      exportData = JSON.stringify(exportObject, null, 2);
      filename = `chat-history-${timestamp}.json`;
      contentType = 'application/json';
    } else {
      // Markdown format
      exportData = generateMarkdownExport(sessionsToExport, {
        exportDate: new Date().toISOString(),
        sessionCount: sessionsToExport.length,
        messageCount: totalMessageCount
      });
      filename = `chat-history-${timestamp}.md`;
      contentType = 'text/markdown';
    }

    const response: ExportResponse = {
      data: exportData,
      filename,
      contentType,
      sessionCount: sessionsToExport.length,
      messageCount: totalMessageCount
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Failed to export chat history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export chat history' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/export/chat-history - Get export options and statistics
 */
export async function GET() {
  try {
    const dataDir = join(process.cwd(), 'data', 'sessions');
    
    // Check if data directory exists
    try {
      await access(dataDir);
    } catch {
      return NextResponse.json({
        success: true,
        data: {
          totalSessions: 0,
          totalMessages: 0,
          dateRange: null,
          availableFormats: ['json', 'markdown']
        }
      });
    }

    // Get session statistics
    const files = await readdir(dataDir);
    const sessionFiles = files.filter(file => file.endsWith('.json'));
    
    let totalMessages = 0;
    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;
    const sessionIds: string[] = [];

    for (const file of sessionFiles) {
      try {
        const sessionId = file.replace('.json', '');
        sessionIds.push(sessionId);

        const filePath = join(dataDir, file);
        const fileContent = await readFile(filePath, 'utf-8');
        const sessionData = JSON.parse(fileContent);

        totalMessages += sessionData.messages?.length || 0;

        const createdAt = new Date(sessionData.createdAt || new Date());
        if (!earliestDate || createdAt < earliestDate) {
          earliestDate = createdAt;
        }
        if (!latestDate || createdAt > latestDate) {
          latestDate = createdAt;
        }
      } catch (error) {
        console.warn(`Failed to read session ${file}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalSessions: sessionFiles.length,
        totalMessages,
        dateRange: earliestDate && latestDate ? {
          earliest: earliestDate.toISOString(),
          latest: latestDate.toISOString()
        } : null,
        availableFormats: ['json', 'markdown'],
        sessionIds
      }
    });

  } catch (error) {
    console.error('Failed to get export info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get export information' },
      { status: 500 }
    );
  }
}

// Helper functions

function sanitizeMessage(message: Message): Message {
  const sanitized = { ...message };
  
  // Remove potentially sensitive metadata
  if (sanitized.metadata) {
    delete sanitized.metadata.processingTime;
    delete sanitized.metadata.tokenCount;
  }
  
  // Sanitize tool calls - remove sensitive arguments
  if (sanitized.toolCalls) {
    sanitized.toolCalls = sanitized.toolCalls.map(toolCall => ({
      ...toolCall,
      function: {
        ...toolCall.function,
        arguments: sanitizeToolArguments(toolCall.function.arguments)
      }
    }));
  }
  
  return sanitized;
}

function sanitizeToolArguments(args: string): string {
  try {
    const parsed = JSON.parse(args);
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(parsed)) {
      const lowerKey = key.toLowerCase();
      
      // Redact potentially sensitive fields
      if (lowerKey.includes('password') || 
          lowerKey.includes('secret') || 
          lowerKey.includes('token') ||
          lowerKey.includes('key') ||
          lowerKey.includes('credential')) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 100) {
        // Truncate very long strings
        sanitized[key] = value.substring(0, 100) + '...';
      } else {
        sanitized[key] = value;
      }
    }
    
    return JSON.stringify(sanitized);
  } catch {
    // If parsing fails, return original (might not be JSON)
    return args;
  }
}

function generateMarkdownExport(sessions: ChatSession[], exportInfo: { exportDate: string; sessionCount: number; messageCount: number }): string {
  let markdown = `# Chat History Export\n\n`;
  markdown += `**Export Date:** ${new Date(exportInfo.exportDate).toLocaleString()}\n`;
  markdown += `**Sessions:** ${exportInfo.sessionCount}\n`;
  markdown += `**Total Messages:** ${exportInfo.messageCount}\n\n`;
  markdown += `---\n\n`;

  for (const session of sessions) {
    markdown += `## ${session.title}\n\n`;
    markdown += `**Session ID:** ${session.id}\n`;
    markdown += `**Created:** ${new Date(session.createdAt).toLocaleString()}\n`;
    markdown += `**Provider:** ${session.provider}\n`;
    markdown += `**Model:** ${session.model}\n`;
    
    if (session.mcpServers && session.mcpServers.length > 0) {
      markdown += `**MCP Servers:** ${session.mcpServers.join(', ')}\n`;
    }
    
    if (session.totalTokens) {
      markdown += `**Total Tokens:** ${session.totalTokens}\n`;
    }
    
    markdown += `\n### Messages\n\n`;

    for (const message of session.messages) {
      const timestamp = new Date(message.timestamp).toLocaleString();
      const role = message.role.charAt(0).toUpperCase() + message.role.slice(1);
      
      markdown += `**${role}** *(${timestamp})*\n\n`;
      markdown += `${message.content}\n\n`;
      
      if (message.toolCalls && message.toolCalls.length > 0) {
        markdown += `*Tool Calls:*\n`;
        for (const toolCall of message.toolCalls) {
          markdown += `- ${toolCall.function.name}\n`;
        }
        markdown += `\n`;
      }
    }
    
    markdown += `---\n\n`;
  }

  return markdown;
}