import { NextRequest, NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

// 获取所有服务器
export async function GET() {
  try {
    const servers = serverMCPServerManager.getAllServers();
    
    return NextResponse.json({
      success: true,
      servers,
      configPath: serverMCPServerManager.getConfigFilePath()
    });
  } catch (error) {
    console.error('Error getting MCP servers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 添加服务器
export async function POST(request: NextRequest) {
  try {
    const serverData = await request.json();
    
    if (!serverData.name || !serverData.command) {
      return NextResponse.json(
        { error: 'Missing required fields: name, command' },
        { status: 400 }
      );
    }

    const serverId = await serverMCPServerManager.addServer(serverData);
    const server = serverMCPServerManager.getServer(serverId);
    
    return NextResponse.json({
      success: true,
      serverId,
      server
    });
  } catch (error) {
    console.error('Error adding MCP server:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 更新服务器
export async function PUT(request: NextRequest) {
  try {
    const serverData = await request.json();
    
    if (!serverData.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    serverMCPServerManager.updateServer(serverData);
    
    return NextResponse.json({
      success: true,
      message: 'Server updated successfully'
    });
  } catch (error) {
    console.error('Error updating MCP server:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 删除服务器
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('id');
    
    if (!serverId) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    serverMCPServerManager.deleteServer(serverId);
    
    return NextResponse.json({
      success: true,
      message: 'Server deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting MCP server:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
