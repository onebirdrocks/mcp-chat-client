import { NextRequest, NextResponse } from 'next/server';
import databaseManager from '@/lib/database-server';

// Update message content (mainly for AI responses)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId } = await params;
    const { content, reasoningSteps } = await request.json();
    
    if (content === undefined) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    await databaseManager.init();
    
    // Update the message in the database
    await databaseManager.updateMessage(messageId, {
      content,
      reasoningSteps: reasoningSteps ? JSON.stringify(reasoningSteps) : null
    });
    
    return NextResponse.json({
      message: 'Message updated successfully'
    });
  } catch (error: any) {
    console.error('Failed to update message:', error);
    return NextResponse.json(
      { error: 'Failed to update message', message: error.message },
      { status: 500 }
    );
  }
}
