import { NextRequest, NextResponse } from 'next/server'
import { toolExecutionManager } from '@/lib/services/ToolExecutionManager'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const limit = searchParams.get('limit')
    const includeStats = searchParams.get('includeStats') === 'true'

    // Get execution history
    const history = toolExecutionManager.getExecutionHistory(
      sessionId || undefined,
      limit ? parseInt(limit, 10) : undefined
    )

    const response: any = {
      history,
      total: history.length,
    }

    // Include statistics if requested
    if (includeStats) {
      response.stats = toolExecutionManager.getExecutionStats(sessionId || undefined)
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Tool execution history API error:', error)
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

    // Clear execution history
    toolExecutionManager.clearHistory(sessionId || undefined)

    return NextResponse.json({
      success: true,
      message: sessionId 
        ? `Execution history cleared for session ${sessionId}`
        : 'All execution history cleared',
    })

  } catch (error) {
    console.error('Tool execution history clear API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}