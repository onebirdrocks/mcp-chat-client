import { NextResponse } from 'next/server';
import { DirectMCPClient } from '@/lib/mcp-client-direct';

export async function GET() {
  let client: DirectMCPClient | null = null;
  
  try {
    console.log('🔧 测试直接MCP客户端');
    
    // 创建直接MCP客户端
    client = new DirectMCPClient(
      'uv',
      ['--directory', '/Users/onebird/github/ebook-mcp/src/ebook_mcp/', 'run', 'main.py'],
      {}
    );
    
    // 连接
    await client.connect();
    
    // 列出工具
    const tools = await client.listTools();
    console.log('🔧 可用工具:', tools);
    
    // 调用工具
    const result = await client.callTool('get_all_pdf_files', {
      path: '/Users/onebird/Downloads'
    });
    
    return NextResponse.json({ 
      success: true, 
      tools: tools.tools?.length || 0,
      result 
    });
  } catch (error) {
    console.error('🔧 直接MCP客户端测试失败:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  } finally {
    if (client) {
      try {
        await client.disconnect();
      } catch (error) {
        console.error('🔧 断开连接失败:', error);
      }
    }
  }
}