import { NextRequest, NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

export async function POST(request: NextRequest) {
  console.log('=== MCP Test Connection API Called ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  
  try {
    console.log('Received MCP test connection request');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { serverType } = body;
    
    if (!serverType) {
      console.log('No serverType provided');
      return NextResponse.json({ 
        success: false,
        error: 'Server type is required' 
      }, { status: 400 });
    }

    console.log(`Testing connection for server: ${serverType}`);
    
    // 检查服务器是否存在
    const server = serverMCPServerManager.getServer(serverType);
    if (!server) {
      throw new Error(`Server '${serverType}' not found`);
    }
    
    console.log('Connecting to MCP server...');
    await serverMCPServerManager.connectServer(serverType);
    
    console.log('Getting tools...');
    const tools = serverMCPServerManager.getServer(serverType)?.tools || [];
    
    console.log('Disconnecting from MCP server...');
    await serverMCPServerManager.disconnectServer(serverType);
    
    console.log(`Successfully connected to ${serverType} and found ${tools.length} tools`);
    
    return NextResponse.json({
      success: true,
      serverType,
      tools,
      message: `Successfully connected to ${serverType} and found ${tools.length} tools`
    });
    
  } catch (error) {
    console.error('MCP connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
