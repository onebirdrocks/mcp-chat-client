import { NextRequest, NextResponse } from 'next/server';
import { mcpManager } from '@/lib/mcp-manager';
import { MCPServer } from '@/types/mcp';

export async function GET() {
  try {
    const servers = mcpManager.getAllServers();
    return NextResponse.json({ servers });
  } catch (error) {
    console.error('Failed to get MCP servers:', error);
    return NextResponse.json(
      { error: 'Failed to get MCP servers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, command, args, env } = body;

    // 验证必需字段
    if (!name || !command) {
      return NextResponse.json(
        { error: 'Name and command are required' },
        { status: 400 }
      );
    }

    // 添加服务器
    const id = mcpManager.addServer({
      name,
      description,
      command,
      args: args ? (typeof args === 'string' ? args.split(' ').filter(Boolean) : args) : [],
      env: env ? JSON.parse(env) : {},
    });

    const newServer = mcpManager.getServer(id);
    return NextResponse.json({ server: newServer }, { status: 201 });
  } catch (error) {
    console.error('Failed to add MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to add MCP server' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...serverData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    const existingServer = mcpManager.getServer(id);
    if (!existingServer) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // 更新服务器
    const updatedServer: MCPServer = {
      ...existingServer,
      ...serverData,
      args: serverData.args ? (typeof serverData.args === 'string' ? serverData.args.split(' ').filter(Boolean) : serverData.args) : existingServer.args,
      env: serverData.env ? (typeof serverData.env === 'string' ? JSON.parse(serverData.env) : serverData.env) : existingServer.env,
    };

    mcpManager.updateServer(updatedServer);
    return NextResponse.json({ server: updatedServer });
  } catch (error) {
    console.error('Failed to update MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to update MCP server' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Server ID is required' },
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

    mcpManager.deleteServer(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to delete MCP server' },
      { status: 500 }
    );
  }
}
