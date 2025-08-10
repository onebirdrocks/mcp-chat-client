import { NextRequest, NextResponse } from 'next/server'
import { mcpConfigManager } from '../../../../lib/mcp-config'
import { getMCPClientManager } from '../../../../lib/services/MCPClientManager'

export const runtime = 'nodejs'

/**
 * GET /api/settings/mcp-servers
 * Get all MCP server configurations
 */
export async function GET() {
  try {
    const config = await mcpConfigManager.getConfig()
    
    return NextResponse.json({
      mcpServers: config.mcpServers
    })
  } catch (error) {
    console.error('Failed to get MCP server configurations:', error)
    return NextResponse.json(
      { error: 'Failed to load MCP server configurations' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/mcp-servers
 * Update or add an MCP server configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const { serverId, config: serverConfig } = await request.json()
    
    if (!serverId || typeof serverId !== 'string') {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      )
    }
    
    if (!serverConfig || typeof serverConfig !== 'object') {
      return NextResponse.json(
        { error: 'Server configuration is required' },
        { status: 400 }
      )
    }
    
    // Validate required fields
    if (!serverConfig.command || typeof serverConfig.command !== 'string') {
      return NextResponse.json(
        { error: 'Command is required' },
        { status: 400 }
      )
    }
    
    // Get current configuration
    const currentConfig = await mcpConfigManager.getConfig()
    
    // Update the server configuration
    const updatedConfig = {
      ...currentConfig,
      mcpServers: {
        ...currentConfig.mcpServers,
        [serverId]: {
          command: serverConfig.command,
          args: Array.isArray(serverConfig.args) ? serverConfig.args : [],
          env: serverConfig.env && typeof serverConfig.env === 'object' ? serverConfig.env : {},
          disabled: Boolean(serverConfig.disabled),
          timeout: typeof serverConfig.timeout === 'number' ? serverConfig.timeout : 30000,
          maxConcurrency: typeof serverConfig.maxConcurrency === 'number' ? serverConfig.maxConcurrency : 5
        }
      }
    }
    
    // Save the updated configuration
    await mcpConfigManager.saveConfig(updatedConfig)
    
    // Update the MCP client manager with new configuration
    const clientManager = getMCPClientManager()
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
    console.error('Failed to update MCP server configuration:', error)
    return NextResponse.json(
      { error: 'Failed to update server configuration' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/mcp-servers
 * Add a new MCP server configuration
 */
export async function POST(request: NextRequest) {
  try {
    const { serverId, config: serverConfig } = await request.json()
    
    if (!serverId || typeof serverId !== 'string') {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      )
    }
    
    // Get current configuration
    const currentConfig = await mcpConfigManager.getConfig()
    
    // Check if server already exists
    if (currentConfig.mcpServers[serverId]) {
      return NextResponse.json(
        { error: 'Server with this ID already exists' },
        { status: 409 }
      )
    }
    
    // Use PUT logic for adding
    return PUT(request)
  } catch (error) {
    console.error('Failed to add MCP server configuration:', error)
    return NextResponse.json(
      { error: 'Failed to add server configuration' },
      { status: 500 }
    )
  }
}