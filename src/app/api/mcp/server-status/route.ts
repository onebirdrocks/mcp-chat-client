import { NextRequest, NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

export async function GET(request: NextRequest) {
  try {
    // 获取服务器状态
    const serverStatus = serverMCPServerManager.getServerStatus();
    const toolToServerMap = serverMCPServerManager.getToolToServerMap();
    const healthyServers = serverMCPServerManager.getHealthyServers();

    // 如果没有连接的工具，尝试连接所有服务器
    if (healthyServers.length === 0) {
      console.log('No connected servers found, attempting to connect all servers...');
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
      
      // 重新获取状态
      const updatedServerStatus = serverMCPServerManager.getServerStatus();
      const updatedToolToServerMap = serverMCPServerManager.getToolToServerMap();
      const updatedHealthyServers = serverMCPServerManager.getHealthyServers();

      return NextResponse.json({
        success: true,
        data: {
          serverStatus: updatedServerStatus,
          toolToServerMap: updatedToolToServerMap,
          healthyServers: updatedHealthyServers,
          summary: {
            totalServers: updatedServerStatus.length,
            healthyServers: updatedHealthyServers.length,
            totalTools: Object.keys(updatedToolToServerMap).length
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        serverStatus,
        toolToServerMap,
        healthyServers,
        summary: {
          totalServers: serverStatus.length,
          healthyServers: healthyServers.length,
          totalTools: Object.keys(toolToServerMap).length
        }
      }
    });
  } catch (error) {
    console.error('Failed to get server status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'reload':
        await serverMCPServerManager.reloadConfig();
        return NextResponse.json({
          success: true,
          message: 'Configuration reloaded successfully'
        });

      case 'health-check':
        // 触发健康检查
        await serverMCPServerManager.reloadConfig();
        const serverStatus = serverMCPServerManager.getServerStatus();
        return NextResponse.json({
          success: true,
          data: {
            serverStatus,
            healthyServers: serverMCPServerManager.getHealthyServers()
          }
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Failed to perform action:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
