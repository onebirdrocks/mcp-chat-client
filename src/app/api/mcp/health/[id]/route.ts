import { NextRequest, NextResponse } from 'next/server';
import { mcpManager } from '@/lib/mcp-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serverId } = await params;
    const health = await mcpManager.checkServerHealth(serverId);
    const server = mcpManager.getServer(serverId);
    
    if (!server) {
      return NextResponse.json({
        success: false,
        error: 'Server not found'
      }, { status: 404 });
    }
    
    // Update server with health information
    server.status = health.status;
    if (health.tools) {
      server.tools = health.tools;
    }
    
    return NextResponse.json({
      success: true,
      server: server
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
