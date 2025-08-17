import { NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

export async function GET() {
  try {
    console.log('🔧 直接测试 executeTool 方法');
    
    // 获取服务器状态
    const serverStatus = serverMCPServerManager.getServerStatus();
    console.log('🔧 Server status:', JSON.stringify(serverStatus, null, 2));
    
    // 先检查工具schema
    const tools = serverMCPServerManager.getAllEnabledTools();
    console.log('🔧 Available tools:', Object.keys(tools));
    
    if (tools['ebook-mcp'] && tools['ebook-mcp']['get_all_pdf_files']) {
      const toolSchema = tools['ebook-mcp']['get_all_pdf_files'];
      console.log('🔧 Processed tool schema:', JSON.stringify(toolSchema, null, 2));
    }
    
    // 获取原始工具信息
    const toolMetadata = serverMCPServerManager.getToolMetadata('get_all_pdf_files');
    console.log('🔧 Tool metadata:', JSON.stringify(toolMetadata, null, 2));
    
    // 直接调用 executeTool
    const result = await serverMCPServerManager.executeTool(
      'ebook-mcp', 
      'get_all_pdf_files', 
      { path: '/Users/onebird/Downloads' }
    );
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('🔧 executeTool test error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
