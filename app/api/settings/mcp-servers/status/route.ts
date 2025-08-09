import { NextResponse } from 'next/server'
import { getMCPClientManager } from '../../../../../lib/services/MCPClientManager'

export const runtime = 'nodejs'

/**
 * GET /api/settings/mcp-servers/status
 * Get connection status for all MCP servers
 */
export async function GET() {
  try {
    const clientManager = getMCPClientManager()
    const statuses = clientManager.getConnectionStatuses()
    
    // Convert the statuses to a more frontend-friendly format
    const formattedStatuses: Record<string, any> = {}
    
    for (const [serverId, status] of Object.entries(statuses)) {
      formattedStatuses[serverId] = {
        serverId: status.serverId,
        status: status.status,
        lastCheck: status.lastCheck.toISOString(),
        responseTime: status.responseTime,
        error: status.error,
        toolCount: status.toolCount,
        uptime: status.uptime
      }
    }
    
    return NextResponse.json(formattedStatuses)
  } catch (error) {
    console.error('Failed to get MCP server statuses:', error)
    return NextResponse.json(
      { error: 'Failed to load server statuses' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/mcp-servers/status
 * Refresh connection status for all MCP servers
 */
export async function POST() {
  try {
    const clientManager = getMCPClientManager()
    
    // Perform health check on all servers
    await clientManager.performHealthCheck()
    
    // Return updated statuses
    const statuses = clientManager.getConnectionStatuses()
    
    const formattedStatuses: Record<string, any> = {}
    
    for (const [serverId, status] of Object.entries(statuses)) {
      formattedStatuses[serverId] = {
        serverId: status.serverId,
        status: status.status,
        lastCheck: status.lastCheck.toISOString(),
        responseTime: status.responseTime,
        error: status.error,
        toolCount: status.toolCount,
        uptime: status.uptime
      }
    }
    
    return NextResponse.json(formattedStatuses)
  } catch (error) {
    console.error('Failed to refresh MCP server statuses:', error)
    return NextResponse.json(
      { error: 'Failed to refresh server statuses' },
      { status: 500 }
    )
  }
}