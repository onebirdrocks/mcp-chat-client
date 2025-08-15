import { NextRequest, NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';
import { MCPServer } from '@/types/mcp';

export async function GET() {
  try {
    const servers = serverMCPServerManager.getAllServers();
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

    // 解析环境变量
    let parsedEnv = {};
    if (env) {
      try {
        if (typeof env === 'string') {
          parsedEnv = JSON.parse(env);
        } else if (typeof env === 'object') {
          parsedEnv = env;
        }
      } catch (parseError) {
        return NextResponse.json(
          { error: 'Invalid environment variables format. Must be valid JSON.' },
          { status: 400 }
        );
      }
    }

    // 添加服务器
    const id = await serverMCPServerManager.addServer({
      name,
      description,
      command,
      args: args ? (typeof args === 'string' ? args.split(' ').filter(Boolean) : args) : [],
      env: parsedEnv,
    });

    const newServer = serverMCPServerManager.getServer(id);
    return NextResponse.json({ server: newServer }, { status: 201 });
  } catch (error) {
    console.error('Failed to add MCP server:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add MCP server' },
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

    const existingServer = serverMCPServerManager.getServer(id);
    if (!existingServer) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // 解析环境变量
    let parsedEnv = existingServer.env;
    if (serverData.env) {
      try {
        if (typeof serverData.env === 'string') {
          parsedEnv = JSON.parse(serverData.env);
        } else if (typeof serverData.env === 'object') {
          parsedEnv = serverData.env;
        }
      } catch (parseError) {
        return NextResponse.json(
          { error: 'Invalid environment variables format. Must be valid JSON.' },
          { status: 400 }
        );
      }
    }

    // 更新服务器
    const updatedServer: MCPServer = {
      ...existingServer,
      ...serverData,
      args: serverData.args ? (typeof serverData.args === 'string' ? serverData.args.split(' ').filter(Boolean) : serverData.args) : existingServer.args,
      env: parsedEnv,
    };

    await serverMCPServerManager.updateServer(updatedServer);
    return NextResponse.json({ server: updatedServer });
  } catch (error) {
    console.error('Failed to update MCP server:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update MCP server' },
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

    const server = serverMCPServerManager.getServer(id);
    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    await serverMCPServerManager.deleteServer(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to delete MCP server' },
      { status: 500 }
    );
  }
}
