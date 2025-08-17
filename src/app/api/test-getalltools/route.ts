import { NextResponse } from 'next/server';
import { serverMCPServerManager } from '@/lib/mcp-manager-server';

export async function GET() {
  try {
    console.log('🔧 Testing getAllEnabledTools...');
    const toolsByServer = serverMCPServerManager.getAllEnabledTools();
    
    console.log('🔧 getAllEnabledTools result:', JSON.stringify(toolsByServer, null, 2));
    
    // 检查是否有 ebook-mcp 服务器
    const ebookTools = toolsByServer['ebook-mcp'] || {};
    const toolNames = Object.keys(ebookTools);
    
    console.log('🔧 ebook-mcp tools:', toolNames);
    console.log('🔧 get_all_pdf_files exists:', 'get_all_pdf_files' in ebookTools);
    
    return NextResponse.json({
      success: true,
      toolsByServer,
      ebookTools: toolNames,
      hasGetAllPdfFiles: 'get_all_pdf_files' in ebookTools
    });
  } catch (error) {
    console.error('🔧 Error testing getAllEnabledTools:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
