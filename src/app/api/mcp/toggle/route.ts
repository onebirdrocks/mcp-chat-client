import { NextRequest, NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

export async function POST(request: NextRequest) {
  try {
    const { serverId, enabled } = await request.json();

    if (!serverId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: serverId, enabled' },
        { status: 400 }
      );
    }

    const result = await serverMCPServerManager.toggleServer(serverId, enabled);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error toggling MCP server:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
