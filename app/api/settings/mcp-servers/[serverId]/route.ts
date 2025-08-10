import { NextRequest, NextResponse } from 'next/server'
import { mcpConfigManager } from '../../../../../lib/mcp-config'
import { getMCPClientManager } from '../../../../../lib/services/MCPClientManager'

export const runtime = 'nodejs'

/**
 * GET /api/settings/mcp-servers/[serverId]
 * Get a specific MCP server configuration
 */
export async function GET(request: NextRequest, context: { params: Promise<{ serverId: string }> }) {
  try {
    const { serverId } = await context.params
    
    const config = await mcpConfigManager.getServerConfig(serverId)
    
    if (!config) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ config })
  } catch (error) {
    console.error(`Failed to get MCP server configuration:`, error)
    return NextResponse.json(
      { error: 'Failed to load server configuration' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings/mcp-servers/[serverId]
 * Delete an MCP server configuration
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ serverId: string }> }) {
  try {
    const { serverId } = await context.params
    
    // Get current configuration
    const currentConfig = await mcpConfigManager.getConfig()
    
    // Check if server exists
    if (!currentConfig.mcpServers[serverId]) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      )
    }
    
    // Remove the server from configuration
    const { [serverId]: removedServer, ...remainingServers } = currentConfig.mcpServers
    
    const updatedConfig = {
      ...currentConfig,
      mcpServers: remainingServers
    }
    
    // Save the updated configuration
    await mcpConfigManager.saveConfig(updatedConfig)
    
    // Disconnect the server from MCP client manager
    const clientManager = getMCPClientManager()
    await clientManager.disconnectServer(serverId)
    
    // Update the MCP client manager with new configuration
    const serverConfigs = Object.entries(updatedConfig.mcpServers).map(([id, config]) => ({
      id,
      name: id,
      command: config.command,
      args: config.args || [],
      env: config.env || {},
      enabled: !config.disabled,
      timeout: config.timeout,
      maxConcurrency: config.maxConcurrency,
    }))
    
    await clientManager.updateServerConfigs(serverConfigs)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`Failed to delete MCP server configuration:`, error)
    return NextResponse.json(
      { error: 'Failed to delete server configuration' },
      { status: 500 }
    )
  }
}