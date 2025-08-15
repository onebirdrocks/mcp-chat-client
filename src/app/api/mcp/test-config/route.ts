import { NextRequest, NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

export async function GET() {
  try {
    const servers = serverMCPServerManager.getAllServers();
    const configPath = serverMCPServerManager.getConfigFilePath();
    
    return NextResponse.json({
      success: true,
      configPath,
      serverCount: servers.length,
      servers: servers.map(server => ({
        id: server.id,
        name: server.name,
        command: server.command,
        args: server.args,
        enabled: server.enabled,
        status: server.status,
        note: server.id === server.name ? 'ID matches name' : 'ID differs from name'
      }))
    });
  } catch (error) {
    console.error('Error testing config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
