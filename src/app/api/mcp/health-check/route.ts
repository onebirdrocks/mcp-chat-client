import { NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

export async function GET() {
  try {
    console.log('🔧 执行MCP服务器健康检查...');
    
    const healthStatus = await serverMCPServerManager.performHealthCheck();
    
    return NextResponse.json({
      success: true,
      data: healthStatus,
      message: `健康检查完成: ${healthStatus.connectedServers}/${healthStatus.totalServers} 个服务器已连接`
    });
  } catch (error) {
    console.error('🔧 健康检查失败:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    console.log('🔧 执行自动连接所有服务器...');
    
    await serverMCPServerManager.autoConnectAllServers();
    
    const healthStatus = await serverMCPServerManager.performHealthCheck();
    
    return NextResponse.json({
      success: true,
      data: healthStatus,
      message: `自动连接完成: ${healthStatus.connectedServers}/${healthStatus.totalServers} 个服务器已连接`
    });
  } catch (error) {
    console.error('🔧 自动连接失败:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}