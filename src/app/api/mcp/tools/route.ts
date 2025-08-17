import { NextRequest, NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

export async function GET(request: NextRequest) {
  try {
    // 使用 getAllEnabledTools 获取工具数据
    const toolsByServer = serverMCPServerManager.getAllEnabledTools();
    
    // 如果没有连接的工具，尝试连接所有服务器
    if (Object.keys(toolsByServer).length === 0) {
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
      
      // 重新获取工具数据
      const updatedToolsByServer = serverMCPServerManager.getAllEnabledTools();
      
      // 转换为扁平化的工具列表格式
      const toolsMetadata = convertToolsToMetadata(updatedToolsByServer);
      
      return NextResponse.json({
        success: true,
        tools: toolsMetadata
      });
    }

    // 转换为扁平化的工具列表格式
    const toolsMetadata = convertToolsToMetadata(toolsByServer);

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

// 辅助函数：将按服务器组织的工具转换为扁平化的工具列表
function convertToolsToMetadata(toolsByServer: Record<string, Record<string, any>>): Array<{
  toolName: string;
  serverName: string;
  description: string;
  inputSchema: any;
  outputSchema: any;
  isConnected: boolean;
}> {
  const toolsMetadata: Array<{
    toolName: string;
    serverName: string;
    description: string;
    inputSchema: any;
    outputSchema: any;
    isConnected: boolean;
  }> = [];

  for (const [serverName, serverTools] of Object.entries(toolsByServer)) {
    for (const [toolName, toolData] of Object.entries(serverTools)) {
      const functionData = toolData.function;
      
      toolsMetadata.push({
        toolName: toolName, // 使用原始工具名称
        serverName,
        description: functionData.description || '',
        inputSchema: functionData.parameters || {},
        outputSchema: {}, // 暂时为空，因为getAllEnabledTools没有包含outputSchema
        isConnected: true // 因为getAllEnabledTools只返回已连接的工具
      });
    }
  }

  return toolsMetadata;
}
