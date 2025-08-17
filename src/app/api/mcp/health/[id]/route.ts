import { NextRequest, NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing server ID' },
        { status: 400 }
      );
    }

    const result = await serverMCPServerManager.checkServerHealth(id);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error checking MCP server health:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
