import { NextRequest, NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { serverName } = body;
    
    if (serverName) {
      console.log(`🔧 重置服务器 ${serverName} 的重连计数`);
      serverMCPServerManager.resetReconnectionAttempts(serverName);
    } else {
      console.log('🔧 重置所有服务器的重连计数');
      serverMCPServerManager.resetReconnectionAttempts();
    }
    
    return NextResponse.json({
      success: true,
      message: serverName ? `已重置服务器 ${serverName} 的重连计数` : '已重置所有服务器的重连计数'
    });
  } catch (error) {
    console.error('🔧 重置重连计数失败:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { maxAttempts, delay } = body;
    
    if (typeof maxAttempts !== 'number' || typeof delay !== 'number') {
      return NextResponse.json(
        { error: 'maxAttempts and delay must be numbers', success: false },
        { status: 400 }
      );
    }
    
    console.log(`🔧 更新重连配置: maxAttempts=${maxAttempts}, delay=${delay}`);
    serverMCPServerManager.setReconnectionConfig(maxAttempts, delay);
    
    return NextResponse.json({
      success: true,
      message: `重连配置已更新: 最大尝试次数=${maxAttempts}, 延迟=${delay}ms`
    });
  } catch (error) {
    console.error('🔧 更新重连配置失败:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}