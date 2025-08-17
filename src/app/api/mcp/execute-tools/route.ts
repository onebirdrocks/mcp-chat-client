import { NextRequest, NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(`🔧 收到工具调用请求:`, JSON.stringify(body, null, 2));
    
    const { toolCalls } = body;
    
    if (!Array.isArray(toolCalls)) {
      console.log(`🔧 工具调用格式错误，期望数组，得到:`, typeof toolCalls);
      return NextResponse.json(
        { error: 'toolCalls must be an array' },
        { status: 400 }
      );
    }
    
    console.log(`🔧 工具调用数量:`, toolCalls.length);
    const results = [];
    
    for (const toolCall of toolCalls) {
      try {
        console.log(`🔧 处理工具调用:`, JSON.stringify(toolCall, null, 2));
        
        // 支持两种格式：toolCall.name + toolCall.arguments 或 toolCall.toolName + toolCall.input
        const toolName = toolCall.name || toolCall.toolName;
        const toolArguments = toolCall.arguments || toolCall.input || {};
        
        console.log(`🔧 执行工具: ${toolName}`);
        console.log(`🔧 工具参数:`, JSON.stringify(toolArguments, null, 2));
        
        if (!toolName) {
          throw new Error('Tool name is undefined or empty');
        }
        
        let result;
        
        // 在所有连接的服务器中查找并执行工具
        console.log(`🔧 在所有服务器中查找工具: ${toolName}`);
        let toolFound = false;
        
        // 获取所有启用的工具
        let toolsByServer = serverMCPServerManager.getAllEnabledTools();
        console.log(`🔧 getAllEnabledTools 返回:`, JSON.stringify(toolsByServer, null, 2));
        console.log(`🔧 查找工具名称: ${toolName}`);
        
        // 如果没有连接的工具，尝试连接所有服务器
        if (Object.keys(toolsByServer).length === 0) {
          console.log('🔧 没有连接的工具，尝试连接所有服务器...');
          const servers = serverMCPServerManager.getAllServers();
          
          for (const server of servers) {
            try {
              console.log(`🔧 尝试连接服务器: ${server.name}`);
              await serverMCPServerManager.connectServer(server.id);
              console.log(`🔧 成功连接服务器: ${server.name}`);
            } catch (error) {
              console.error(`🔧 连接服务器 ${server.name} 失败:`, error);
            }
          }
          
          // 重新获取工具数据
          toolsByServer = serverMCPServerManager.getAllEnabledTools();
          console.log(`🔧 重新获取工具数据:`, JSON.stringify(toolsByServer, null, 2));
        }
        
        // 在所有服务器中查找工具
        for (const [serverName, serverTools] of Object.entries(toolsByServer)) {
          console.log(`🔧 检查服务器 ${serverName} 的工具:`, Object.keys(serverTools));
          console.log(`🔧 工具 ${toolName} 是否在 ${serverName} 中:`, toolName in serverTools);
          if (serverTools[toolName]) {
            console.log(`🔧 在服务器 ${serverName} 中找到工具: ${toolName}`);
            try {
              result = await serverMCPServerManager.executeTool(serverName, toolName, toolArguments);
              console.log(`🔧 工具执行成功:`, result);
              toolFound = true;
              break;
            } catch (error) {
              console.log(`🔧 在服务器 ${serverName} 中执行工具失败:`, error);
              // 继续尝试其他服务器
            }
          }
        }
        
        // 如果没有找到工具，尝试系统工具
        if (!toolFound) {
          console.log(`🔧 工具 ${toolName} 未在任何服务器中找到，尝试系统工具`);
          result = await executeSystemTool(toolCall);
        }
        
        results.push({
          toolCallId: toolCall.toolCallId || toolCall.id,
          success: true,
          result
        });
        
        console.log(`🔧 Tool ${toolName} executed successfully`);
      } catch (error: any) {
        console.error(`🔧 Error executing tool ${toolCall.name || toolCall.toolName}:`, error);
        console.error(`🔧 Error stack:`, error.stack);
        
        results.push({
          toolCallId: toolCall.toolCallId || toolCall.id,
          success: false,
          error: error.message || 'Unknown error occurred'
        });
      }
    }
    
    console.log(`🔧 返回结果:`, JSON.stringify(results, null, 2));
    return NextResponse.json({ results });
  } catch (error) {
    console.error('🔧 Error executing tools:', error);
    return NextResponse.json({ error: 'Failed to execute tools' }, { status: 500 });
  }
}

// 解析工具名称，提取服务器名称和工具名称
function parseToolName(fullToolName: string): [string | null, string] {
  // 支持多种分隔符格式：serverName_toolName 或 serverName:toolName
  const underscoreIndex = fullToolName.indexOf('_');
  const colonIndex = fullToolName.indexOf(':');
  
  if (underscoreIndex !== -1) {
    const serverName = fullToolName.substring(0, underscoreIndex);
    const toolName = fullToolName.substring(underscoreIndex + 1);
    return [serverName, toolName];
  } else if (colonIndex !== -1) {
    const serverName = fullToolName.substring(0, colonIndex);
    const toolName = fullToolName.substring(colonIndex + 1);
    return [serverName, toolName];
  }
  
  // 如果没有分隔符，返回 null 作为服务器名称
  return [null, fullToolName];
}

// 执行系统工具
async function executeSystemTool(toolCall: any): Promise<any> {
  // 只处理真正的系统工具，不提供 mock 数据
  const toolName = toolCall.name || toolCall.toolName;
  switch (toolName) {
    case 'system:getCurrentTime':
      return {
        currentTime: new Date().toISOString(),
        timezone: 'UTC'
      };
    default:
      throw new Error(`Unknown system tool: ${toolName}`);
  }
}










