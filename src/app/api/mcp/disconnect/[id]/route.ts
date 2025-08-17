import { NextRequest, NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serverId } = await params;
    
    console.log(`Disconnecting from server: ${serverId}`);
    
    // 断开服务器连接
    await serverMCPServerManager.disconnectServer(serverId);
    
    // 获取更新后的服务器信息
    const server = serverMCPServerManager.getServer(serverId);
    
    if (!server) {
      return NextResponse.json({
        success: false,
        error: 'Server not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      server: server,
      message: `Server ${server.name} disconnected successfully`
    });
  } catch (error) {
    console.error('Disconnect failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
