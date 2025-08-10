import { NextRequest, NextResponse } from 'next/server'
import { toolExecutionManager } from '@/lib/services/ToolExecutionManager'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    // Get active executions
    let activeExecutions = toolExecutionManager.getActiveExecutions()

    // Filter by session if specified
    if (sessionId) {
      activeExecutions = activeExecutions.filter(
        exec => exec.sessionId === sessionId
      )
    }

    // Transform to safe response format (remove sensitive data)
    const safeExecutions = activeExecutions.map(exec => ({
      toolCallId: exec.toolCall.id,
      sessionId: exec.sessionId,
      toolName: exec.toolCall.function.name,
      serverId: exec.toolCall.serverId,
      startTime: exec.startTime,
      timeout: exec.timeout,
      elapsedTime: Date.now() - exec.startTime.getTime(),
      parameters: JSON.parse(exec.toolCall.function.arguments),
    }))

    return NextResponse.json({
      activeExecutions: safeExecutions,
      total: safeExecutions.length,
    })

  } catch (error) {
    console.error('Active tool executions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    // Get active executions to cancel
    let activeExecutions = toolExecutionManager.getActiveExecutions()

    if (sessionId) {
      activeExecutions = activeExecutions.filter(
        exec => exec.sessionId === sessionId
      )
    }

    // Cancel all matching executions
    let cancelledCount = 0
    for (const exec of activeExecutions) {
      if (toolExecutionManager.cancelExecution(exec.toolCall.id)) {
        cancelledCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cancelled ${cancelledCount} active tool executions`,
      cancelledCount,
    })

  } catch (error) {
    console.error('Cancel active executions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}