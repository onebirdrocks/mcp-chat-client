import { NextRequest, NextResponse } from 'next/server';
import { createMCPClient } from '@/lib/server/mcp-client';

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

    console.log(`Creating MCP client for server type: ${serverType}`);
    const client = createMCPClient(serverType, {});
    
    console.log('Connecting to MCP server...');
    await client.connect();
    
    console.log('Listing tools...');
    const tools = await client.listTools();
    
    console.log('Disconnecting from MCP server...');
    await client.disconnect();
    
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
