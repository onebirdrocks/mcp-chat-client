import { NextRequest, NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

export async function GET(request: NextRequest) {
  try {
    // 获取所有服务器的工具元数据
    const toolsMetadata = serverMCPServerManager.getAllToolsMetadata();
    
    // 如果没有连接的工具，尝试连接所有服务器
    if (toolsMetadata.length === 0) {
      console.log('No connected tools found, attempting to connect all servers...');
      const servers = serverMCPServerManager.getAllServers();
      
      for (const server of servers) {
        try {
          console.log(`Attempting to connect to server: ${server.name}`);
          await serverMCPServerManager.connectServer(server.id);
          console.log(`Successfully connected to server: ${server.name}`);
        } catch (error) {
          console.error(`Failed to connect to server ${server.name}:`, error);
        }
      }
      
      // 重新获取工具元数据
      const updatedToolsMetadata = serverMCPServerManager.getAllToolsMetadata();
      return NextResponse.json({
        success: true,
        tools: updatedToolsMetadata
      });
    }

    return NextResponse.json({
      success: true,
      tools: toolsMetadata
    });

  } catch (error) {
    console.error('Error getting MCP tools:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
