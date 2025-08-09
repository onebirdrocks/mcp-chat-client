import { NextResponse } from 'next/server'
import { getMCPClientManager } from '../../../../../lib/services/MCPClientManager'

export const runtime = 'nodejs'

/**
 * GET /api/settings/mcp-servers/tools
 * Get available tools from all MCP servers
 */
export async function GET() {
  try {
    const clientManager = getMCPClientManager()
    
    // Get all tools from all servers
    const allTools = clientManager.getAllTools()
    
    // Group tools by server ID
    const toolsByServer: Record<string, any[]> = {}
    
    for (const tool of allTools) {
      if (!toolsByServer[tool.serverId]) {
        toolsByServer[tool.serverId] = []
      }
      
      toolsByServer[tool.serverId].push({
        name: tool.name,
        description: tool.description,
        category: tool.category,
        dangerous: tool.dangerous,
        requiresConfirmation: tool.requiresConfirmation,
        inputSchema: tool.inputSchema
      })
    }
    
    return NextResponse.json(toolsByServer)
  } catch (error) {
    console.error('Failed to get MCP server tools:', error)
    return NextResponse.json(
      { error: 'Failed to load server tools' },
      { status: 500 }
    )
  }
}