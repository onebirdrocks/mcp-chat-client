import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '../../../../../backend/src/services/SessionManager';
import { NotFoundError } from '../../../../../backend/src/lib/errors';

export const runtime = 'nodejs';

/**
 * POST /api/sessions/[sessionId]/generate-title - Generate automatic title for session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    const sessionManager = getSessionManager();
    await sessionManager.initialize();
    
    // For now, generate a fallback title since we don't have LLM service integrated yet
    // In the future, this would use the LLM service to generate intelligent titles
    const session = await sessionManager.getSession(sessionId);
    
    let generatedTitle = 'New Chat';
    
    // Generate title based on first user message
    const userMessages = session.messages.filter((msg: any) => msg.role === 'user');
    if (userMessages.length > 0) {
      const firstMessage = userMessages[0].content;
      // Take first 40 characters and add ellipsis if longer
      generatedTitle = firstMessage.length > 40 
        ? `${firstMessage.substring(0, 40)}...`
        : firstMessage;
      
      // Clean up the title
      generatedTitle = generatedTitle
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
    } else {
      // Use date-based title if no user messages
      const date = session.createdAt.toLocaleDateString();
      generatedTitle = `Chat from ${date}`;
    }
    
    // Update the session with the new title
    await sessionManager.updateSession(sessionId, { title: generatedTitle });
    
    return NextResponse.json({
      success: true,
      data: {
        title: generatedTitle,
        sessionId,
      },
      message: 'Title generated successfully',
    });
    
  } catch (error) {
    console.error(`Failed to generate title for session ${params.sessionId}:`, error);
    
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to generate session title' },
      { status: 500 }
    );
  }
}