import { NextResponse } from 'next/server';
import { DirectMCPClient } from '@/lib/mcp-client-direct';

export async function GET() {
  let client: DirectMCPClient | null = null;
  
  try {
    // 使用标准MCP SDK客户端
    client = new DirectMCPClient(
      'uv',
      [
        '--directory',
        '/Users/onebird/github/ebook-mcp/src/ebook_mcp/',
        'run',
        'main.py'
      ],
      process.env as Record<string, string>
    );

    console.log('🔧 连接到MCP服务器...');
    await client.connect();
    console.log('🔧 连接成功!');

    // 1) 获取工具列表
    console.log('🔧 获取工具列表...');
    const toolsResponse = await client.listTools();
    console.log('🔧 工具列表:', toolsResponse);

    // 2) 测试工具调用
    console.log('🔧 准备调用 get_all_epub_files 工具');
    const res1 = await client.callTool('get_all_epub_files', { path: '/Users/onebird/Downloads' });
    console.log('🔧 工具调用结果:', res1);

    return NextResponse.json({ 
      tools: toolsResponse.tools,
      result: res1 
    });
  } catch (error) {
    console.error('Smoke test error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    // 确保关闭连接
    if (client) {
      try {
        await client.close();
        console.log('🔧 客户端连接已关闭');
      } catch (closeError) {
        console.error('关闭客户端时出错:', closeError);
      }
    }
  }
}
