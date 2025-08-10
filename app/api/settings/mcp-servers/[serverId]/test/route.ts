import { NextRequest, NextResponse } from 'next/server'
import { getMCPClientManager } from '../../../../../../lib/services/MCPClientManager'
import { mcpConfigManager } from '../../../../../../lib/mcp-config'

export const runtime = 'nodejs'

/**
 * POST /api/settings/mcp-servers/[serverId]/test
 * Test connection to a specific MCP server
 */
export async function POST(request: NextRequest, context: { params: Promise<{ serverId: string }> }) {
  try {
    const { serverId } = await context.params
    
    // Get server configuration
    const serverConfig = await mcpConfigManager.getServerConfig(serverId)
    
    if (!serverConfig) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      )
    }
    
    const clientManager = getMCPClientManager()
    
    // Try to reconnect the server to test the connection
    try {
      await clientManager.reconnectServer(serverId)
      
      // Get the updated connection status
      const statuses = clientManager.getConnectionStatuses()
      const status = statuses[serverId]
      
      if (!status) {
        return NextResponse.json({
          success: false,
          error: 'Server status not available',
          timestamp: new Date().toISOString()
        })
      }
      
      const isHealthy = status.status === 'healthy'
      
      return NextResponse.json({
        success: isHealthy,
        status: status.status,
        error: status.error,
        toolCount: status.toolCount,
        responseTime: status.responseTime,
        uptime: status.uptime,
        lastCheck: status.lastCheck,
        timestamp: new Date().toISOString()
      })
    } catch (connectionError) {
      console.error(`Connection test failed for ${serverId}:`, connectionError)
      
      return NextResponse.json({
        success: false,
        error: connectionError instanceof Error ? connectionError.message : 'Connection failed',
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error(`Failed to test MCP server connection for ${params.serverId}:`, error)
    return NextResponse.json(
      { error: 'Failed to test server connection' },
      { status: 500 }
    )
  }
}