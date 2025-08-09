import { NextRequest, NextResponse } from 'next/server'
import { CancelToolRequest, CancelToolResponse } from '@/lib/types'

export const runtime = 'nodejs'

// Mock tool execution tracking - will be replaced with actual implementation in later tasks
class MockToolExecutionTracker {
  private pendingTools = new Map<string, { sessionId: string; toolCall: unknown }>()
  
  addPendingTool(toolCallId: string, sessionId: string, toolCall: unknown) {
    this.pendingTools.set(toolCallId, { sessionId, toolCall })
  }
  
  cancelTool(toolCallId: string, sessionId: string): boolean {
    const pending = this.pendingTools.get(toolCallId)
    if (pending && pending.sessionId === sessionId) {
      this.pendingTools.delete(toolCallId)
      return true
    }
    return false
  }
  
  isPending(toolCallId: string): boolean {
    return this.pendingTools.has(toolCallId)
  }
}

const mockTracker = new MockToolExecutionTracker()

export async function POST(request: NextRequest) {
  try {
    const body: CancelToolRequest = await request.json()
    
    // Validate required fields
    if (!body.toolCallId) {
      return NextResponse.json(
        { error: 'Tool call ID is required' },
        { status: 400 }
      )
    }
    
    if (!body.sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    // Check if tool call exists and belongs to the session
    const wasPending = mockTracker.isPending(body.toolCallId)
    
    if (!wasPending) {
      return NextResponse.json({
        success: false,
        message: 'Tool call not found or already completed'
      } as CancelToolResponse)
    }
    
    // Cancel the tool execution
    const cancelled = mockTracker.cancelTool(body.toolCallId, body.sessionId)
    
    if (cancelled) {
      console.log(`Tool call ${body.toolCallId} cancelled for session ${body.sessionId}`, 
        body.reason ? `Reason: ${body.reason}` : '')
      
      return NextResponse.json({
        success: true,
        message: 'Tool execution cancelled successfully'
      } as CancelToolResponse)
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to cancel tool execution'
      } as CancelToolResponse)
    }
    
  } catch (error) {
    console.error('Cancel tool API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Optional: Get status of pending tool calls for a session
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  
  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID is required' },
      { status: 400 }
    )
  }
  
  // Mock response - in actual implementation, this would return real pending tools
  return NextResponse.json({
    sessionId,
    pendingTools: [],
    message: 'Mock implementation - will be replaced with actual tool tracking'
  })
}