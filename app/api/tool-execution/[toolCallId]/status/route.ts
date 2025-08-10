import { NextRequest, NextResponse } from 'next/server'
import { toolExecutionManager } from '@/lib/services/ToolExecutionManager'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ toolCallId: string }> }
) {
  try {
    const { toolCallId } = await context.params
    
    if (!toolCallId) {
      return NextResponse.json(
        { error: 'Tool call ID is required' },
        { status: 400 }
      )
    }

    // Get active execution status
    const activeExecutions = toolExecutionManager.getActiveExecutions()
    const activeExecution = activeExecutions.find(
      exec => exec.toolCall.id === toolCallId
    )

    if (activeExecution) {
      return NextResponse.json({
        status: 'active',
        toolCallId,
        sessionId: activeExecution.sessionId,
        startTime: activeExecution.startTime,
        timeout: activeExecution.timeout,
        toolName: activeExecution.toolCall.function.name,
        serverId: activeExecution.toolCall.serverId,
      })
    }

    // Check execution history
    const history = toolExecutionManager.getExecutionHistory()
    const historyEntry = history.find(entry => entry.toolCallId === toolCallId)

    if (historyEntry) {
      return NextResponse.json({
        status: 'completed',
        toolCallId,
        sessionId: historyEntry.sessionId,
        result: historyEntry.status,
        startTime: historyEntry.startTime,
        endTime: historyEntry.endTime,
        executionTime: historyEntry.executionTime,
        toolName: historyEntry.toolName,
        serverId: historyEntry.serverId,
        error: historyEntry.error,
        progress: historyEntry.progress,
      })
    }

    return NextResponse.json(
      { error: 'Tool execution not found' },
      { status: 404 }
    )

  } catch (error) {
    console.error('Tool execution status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ toolCallId: string }> }
) {
  try {
    const { toolCallId } = await context.params
    
    if (!toolCallId) {
      return NextResponse.json(
        { error: 'Tool call ID is required' },
        { status: 400 }
      )
    }

    // Cancel the execution
    const cancelled = toolExecutionManager.cancelExecution(toolCallId)

    if (cancelled) {
      return NextResponse.json({
        success: true,
        message: 'Tool execution cancelled successfully',
        toolCallId,
      })
    } else {
      return NextResponse.json(
        { error: 'Tool execution not found or already completed' },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('Tool execution cancellation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}