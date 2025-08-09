import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '../../../../backend/src/services/SessionManager';
import { ValidationError, NotFoundError } from '../../../../backend/src/lib/errors';

export const runtime = 'nodejs';

interface UpdateSessionRequest {
  title?: string;
  mcpServers?: string[];
  archived?: boolean;
}

/**
 * GET /api/sessions/[sessionId] - Get a specific session with full message history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    const sessionManager = getSessionManager();
    await sessionManager.initialize();
    
    const session = await sessionManager.getSession(sessionId);
    
    // Convert dates to ISO strings for JSON serialization
    const serializedSession = {
      ...session,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messages: session.messages.map((message: any) => ({
        ...message,
        timestamp: message.timestamp.toISOString(),
      })),
    };
    
    return NextResponse.json({
      success: true,
      data: { session: serializedSession },
    });
    
  } catch (error) {
    console.error(`Failed to get session ${params.sessionId}:`, error);
    
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sessions/[sessionId] - Update a session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body: UpdateSessionRequest = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Validate update data
    const { title, mcpServers, archived } = body;
    const updates: any = {};
    
    if (title !== undefined) {
      if (typeof title !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Title must be a string' },
          { status: 400 }
        );
      }
      updates.title = title.trim();
    }
    
    if (mcpServers !== undefined) {
      if (!Array.isArray(mcpServers)) {
        return NextResponse.json(
          { success: false, error: 'mcpServers must be an array' },
          { status: 400 }
        );
      }
      updates.mcpServers = mcpServers;
    }
    
    if (archived !== undefined) {
      if (typeof archived !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'archived must be a boolean' },
          { status: 400 }
        );
      }
      // Note: archived field is not in the current ChatSession type
      // This would need to be added to support archiving
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid updates provided' },
        { status: 400 }
      );
    }
    
    const sessionManager = getSessionManager();
    await sessionManager.initialize();
    
    const updatedSession = await sessionManager.updateSession(sessionId, updates);
    
    // Convert dates to ISO strings for JSON serialization
    const serializedSession = {
      ...updatedSession,
      createdAt: updatedSession.createdAt.toISOString(),
      updatedAt: updatedSession.updatedAt.toISOString(),
      messages: updatedSession.messages.map((message: any) => ({
        ...message,
        timestamp: message.timestamp.toISOString(),
      })),
    };
    
    return NextResponse.json({
      success: true,
      data: { session: serializedSession },
      message: 'Session updated successfully',
    });
    
  } catch (error) {
    console.error(`Failed to update session ${params.sessionId}:`, error);
    
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[sessionId] - Delete a session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    const sessionManager = getSessionManager();
    await sessionManager.initialize();
    
    await sessionManager.deleteSession(sessionId);
    
    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
    });
    
  } catch (error) {
    console.error(`Failed to delete session ${params.sessionId}:`, error);
    
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}