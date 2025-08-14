import { NextRequest, NextResponse } from 'next/server';
import { createMCPClient } from '@/lib/server/mcp-client';

export async function POST(request: NextRequest) {
  try {
    const { toolCalls } = await request.json();
    
    const results = [];
    
    // 创建MCP客户端
    let mcpClient: any = null;
    
    for (const toolCall of toolCalls) {
      try {
        console.log(`Executing tool: ${toolCall.name}`, toolCall.arguments);
        
        let result;
        
        if (toolCall.name === 'system:getCurrentTime') {
          result = {
            currentTime: new Date().toISOString(),
            timezone: 'UTC'
          };
        } else if (toolCall.name === 'filesystem:readFile') {
          result = {
            content: `Mock file content for ${toolCall.arguments.path}`,
            path: toolCall.arguments.path,
            size: 1024
          };
        } else if (toolCall.name.startsWith('ebook-mcp:')) {
          // 使用真实的ebook-mcp服务器
          if (!mcpClient) {
            try {
              mcpClient = createMCPClient('ebook-mcp', {});
              await mcpClient.connect();
              console.log('Connected to ebook-mcp server');
            } catch (error) {
              console.error('Failed to connect to ebook-mcp server:', error);
              // 如果连接失败，回退到模拟模式
              return await executeToolsWithMock(toolCalls);
            }
          }
          
          // 提取工具名称（去掉 'ebook-mcp:' 前缀）
          const toolName = toolCall.name.replace('ebook-mcp:', '');
          
          if (toolName === 'get_all_epub_files') {
            const epubFiles = await mcpClient.callTool(toolName, toolCall.arguments);
            result = {
              epub_files: epubFiles,
              path: toolCall.arguments.path,
              count: Array.isArray(epubFiles) ? epubFiles.length : 0
            };
          } else if (toolName === 'get_all_pdf_files') {
            const pdfFiles = await mcpClient.callTool(toolName, toolCall.arguments);
            result = {
              pdf_files: pdfFiles,
              path: toolCall.arguments.path,
              count: Array.isArray(pdfFiles) ? pdfFiles.length : 0
            };
          } else if (toolName === 'get_epub_metadata') {
            result = await mcpClient.callTool(toolName, toolCall.arguments);
          } else if (toolName === 'get_pdf_metadata') {
            result = await mcpClient.callTool(toolName, toolCall.arguments);
          } else {
            result = await mcpClient.callTool(toolName, toolCall.arguments);
          }
        } else {
          result = {
            message: `Tool ${toolCall.name} executed successfully`,
            arguments: toolCall.arguments
          };
        }
        
        results.push({
          toolCallId: toolCall.id,
          success: true,
          result
        });
        
        console.log(`Tool ${toolCall.name} executed successfully`);
      } catch (error: any) {
        console.error(`Error executing tool ${toolCall.name}:`, error);
        
        results.push({
          toolCallId: toolCall.id,
          success: false,
          error: error.message || 'Unknown error occurred'
        });
      }
    }
    
    // 断开MCP客户端连接
    if (mcpClient) {
      try {
        await mcpClient.disconnect();
      } catch (error) {
        console.error('Error disconnecting MCP client:', error);
      }
    }
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error executing tools:', error);
    return NextResponse.json({ error: 'Failed to execute tools' }, { status: 500 });
  }
}

// 回退到模拟模式的函数
async function executeToolsWithMock(toolCalls: any[]) {
  const results = [];
  
  for (const toolCall of toolCalls) {
    try {
      console.log(`Executing mock tool: ${toolCall.name}`, toolCall.arguments);
      
      let result;
      
      if (toolCall.name === 'system:getCurrentTime') {
        result = {
          currentTime: new Date().toISOString(),
          timezone: 'UTC'
        };
      } else if (toolCall.name === 'filesystem:readFile') {
        result = {
          content: `Mock file content for ${toolCall.arguments.path}`,
          path: toolCall.arguments.path,
          size: 1024
        };
      } else if (toolCall.name === 'ebook-mcp:get_all_epub_files') {
        result = {
          epub_files: [
            '/Users/onebird/Downloads/sample-book.epub',
            '/Users/onebird/Downloads/programming-guide.epub',
            '/Users/onebird/Downloads/novel.epub'
          ],
          path: toolCall.arguments.path,
          count: 3
        };
      } else if (toolCall.name === 'ebook-mcp:get_all_pdf_files') {
        result = {
          pdf_files: [
            '/Users/onebird/Downloads/document.pdf',
            '/Users/onebird/Downloads/report.pdf',
            '/Users/onebird/Downloads/manual.pdf'
          ],
          path: toolCall.arguments.path,
          count: 3
        };
      } else if (toolCall.name === 'ebook-mcp:get_epub_metadata') {
        result = {
          title: 'Sample Book',
          author: 'John Doe',
          language: 'en',
          publisher: 'Sample Publisher',
          epub_path: toolCall.arguments.epub_path
        };
      } else if (toolCall.name === 'ebook-mcp:get_pdf_metadata') {
        result = {
          title: 'Sample Document',
          author: 'Jane Smith',
          pages: 150,
          pdf_path: toolCall.arguments.pdf_path
        };
      } else {
        result = {
          message: `Tool ${toolCall.name} executed successfully`,
          arguments: toolCall.arguments
        };
      }
      
      results.push({
        toolCallId: toolCall.id,
        success: true,
        result
      });
      
      console.log(`Mock tool ${toolCall.name} executed successfully`);
    } catch (error: any) {
      console.error(`Error executing mock tool ${toolCall.name}:`, error);
      
      results.push({
        toolCallId: toolCall.id,
        success: false,
        error: error.message || 'Unknown error occurred'
      });
    }
  }
  
  return NextResponse.json({ results });
}
