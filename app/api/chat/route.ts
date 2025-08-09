import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Placeholder implementation - will be replaced in later tasks
    return NextResponse.json({
      message: 'Chat API endpoint - implementation pending',
      received: body
    })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}