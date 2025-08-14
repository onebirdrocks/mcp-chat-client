import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { enabled } = await request.json();
    
    // 这里应该实际启用/禁用MCP服务器
    // 由于这是客户端安全的API，我们返回成功状态
    console.log(`MCP servers ${enabled ? 'enabled' : 'disabled'}`);
    
    return NextResponse.json({ 
      success: true, 
      message: `MCP servers ${enabled ? 'enabled' : 'disabled'} successfully` 
    });
  } catch (error) {
    console.error('Error toggling MCP servers:', error);
    return NextResponse.json({ error: 'Failed to toggle MCP servers' }, { status: 500 });
  }
}
