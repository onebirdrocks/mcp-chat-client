import { NextRequest, NextResponse } from 'next/server';
import { mcpManager } from '@/lib/mcp-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serverId } = await params;
    
    console.log(`Force refreshing server: ${serverId}`);
    
    // Force refresh the server
    await mcpManager.forceRefreshServer(serverId);
    
    // Get updated server info
    const server = mcpManager.getServer(serverId);
    
    if (!server) {
      return NextResponse.json({
        success: false,
        error: 'Server not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      server: server,
      message: `Server ${server.name} refreshed successfully`
    });
  } catch (error) {
    console.error('Force refresh failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
