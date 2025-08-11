import { NextRequest, NextResponse } from 'next/server';
import { mcpManager } from '@/lib/mcp-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, enabled } = body;

    if (id === undefined || enabled === undefined) {
      return NextResponse.json(
        { error: 'Server ID and enabled status are required' },
        { status: 400 }
      );
    }

    const server = mcpManager.getServer(id);
    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // 切换服务器状态 (enabled状态不保存到文件)
    await mcpManager.toggleServer(id, enabled);
    
    const updatedServer = mcpManager.getServer(id);
    return NextResponse.json({ server: updatedServer });
  } catch (error) {
    console.error('Failed to toggle MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to toggle MCP server' },
      { status: 500 }
    );
  }
}
