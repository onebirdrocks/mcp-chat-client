import { NextRequest, NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

export async function POST(request: NextRequest) {
  try {
    serverMCPServerManager.reloadConfig();
    
    return NextResponse.json({
      success: true,
      message: 'Configuration reloaded successfully',
      configPath: serverMCPServerManager.getConfigFilePath()
    });
  } catch (error) {
    console.error('Error reloading MCP configuration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
