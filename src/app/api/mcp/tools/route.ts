import { NextResponse } from 'next/server';
import { mcpManager } from '@/lib/mcp-manager';

export async function GET() {
  try {
    // 从 MCP 管理器获取真实的工具列表
    const allTools = mcpManager.getAllEnabledTools();
    
    // 转换为 AI SDK 格式的工具定义
    const tools = allTools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema || {
          type: 'object',
          properties: {},
          required: []
        }
      }
    }));

    console.log(`Returning ${tools.length} real MCP tools from ${allTools.length} total tools`);
    
    return NextResponse.json({ 
      tools,
      totalTools: allTools.length,
      source: 'real-mcp-servers'
    });
  } catch (error) {
    console.error('Error getting MCP tools:', error);
    return NextResponse.json({ 
      error: 'Failed to get tools',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
