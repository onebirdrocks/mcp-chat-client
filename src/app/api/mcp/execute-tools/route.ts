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
        
        // 解析工具名称，提取服务器名称和工具名称
        const [serverName, actualToolName] = parseToolName(toolName);
        console.log(`🔧 解析结果 - 服务器名: ${serverName}, 工具名: ${actualToolName}`);
        
        if (serverName) {
          // 确保服务器连接
          console.log(`🔧 检查服务器 ${serverName} 连接状态...`);
          const servers = serverMCPServerManager.getAllServers();
          const targetServer = servers.find(s => s.name === serverName);
          
          if (!targetServer) {
            throw new Error(`Server ${serverName} not found in configuration`);
          }
          
          // 尝试连接服务器
          try {
            await serverMCPServerManager.connectServer(targetServer.id);
            console.log(`🔧 服务器 ${serverName} 连接成功`);
          } catch (connectError) {
            console.log(`🔧 服务器 ${serverName} 连接失败:`, connectError);
            // 继续尝试执行工具，可能已经连接了
          }
          
          // 使用 serverMCPServerManager 执行工具
          const fullToolName = `${serverName}_${actualToolName}`;
          console.log(`🔧 完整工具名: ${fullToolName}`);
          result = await serverMCPServerManager.executeTool(fullToolName, toolArguments);
        } else {
          // 处理系统工具或未识别的工具
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
  switch (toolCall.name) {
    case 'system:getCurrentTime':
      return {
        currentTime: new Date().toISOString(),
        timezone: 'UTC'
      };
    default:
      throw new Error(`Unknown system tool: ${toolCall.name}`);
  }
}










