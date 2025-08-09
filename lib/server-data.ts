import { readFile, access, readdir } from 'fs/promises'
import { join } from 'path'

// Types for server-side data
export interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  provider: string
  model: string
  tags: string[]
  archived: boolean
  totalTokens: number
  estimatedCost: number
}

export interface ChatHistoryStats {
  totalSessions: number
  totalMessages: number
  totalTokensUsed: number
  estimatedTotalCost: number
  activeConnections: number
  uptime: number
  lastBackup?: string
}

export interface ServerSettings {
  llmProviders: Array<{
    id: string
    name: string
    displayName: string
    enabled: boolean
    models: Array<{
      id: string
      name: string
      displayName: string
      supportsToolCalling: boolean
    }>
    status: 'connected' | 'disconnected' | 'error'
  }>
  mcpServers: Array<{
    id: string
    name: string
    displayName: string
    enabled: boolean
    status: 'connected' | 'disconnected' | 'error' | 'connecting'
    toolCount: number
  }>
  systemInfo: {
    version: string
    uptime: number
    environment: string
  }
}

/**
 * Server-side chat history data fetching
 * Reads chat sessions from the data directory
 */
export async function getChatHistory(): Promise<{
  sessions: ChatSession[]
  stats: ChatHistoryStats
}> {
  try {
    const dataDir = join(process.cwd(), 'data', 'sessions')
    
    // Check if data directory exists
    try {
      await access(dataDir)
    } catch {
      // Return empty data if directory doesn't exist
      return {
        sessions: [],
        stats: {
          totalSessions: 0,
          totalMessages: 0,
          totalTokensUsed: 0,
          estimatedTotalCost: 0,
          activeConnections: 0,
          uptime: process.uptime()
        }
      }
    }
    
    // Read session files
    const files = await readdir(dataDir)
    const sessionFiles = files.filter(file => file.endsWith('.json'))
    
    const sessions: ChatSession[] = []
    let totalMessages = 0
    let totalTokens = 0
    let totalCost = 0
    
    for (const file of sessionFiles) {
      try {
        const filePath = join(dataDir, file)
        const fileContent = await readFile(filePath, 'utf-8')
        const sessionData = JSON.parse(fileContent)
        
        // Extract session metadata
        const session: ChatSession = {
          id: sessionData.id || file.replace('.json', ''),
          title: sessionData.title || 'Untitled Session',
          createdAt: sessionData.createdAt || new Date().toISOString(),
          updatedAt: sessionData.updatedAt || new Date().toISOString(),
          messageCount: sessionData.messages?.length || 0,
          provider: sessionData.provider || 'unknown',
          model: sessionData.model || 'unknown',
          tags: sessionData.tags || [],
          archived: sessionData.archived || false,
          totalTokens: sessionData.totalTokens || 0,
          estimatedCost: sessionData.estimatedCost || 0
        }
        
        sessions.push(session)
        totalMessages += session.messageCount
        totalTokens += session.totalTokens
        totalCost += session.estimatedCost
      } catch (error) {
        console.warn(`Failed to read session file ${file}:`, error)
      }
    }
    
    // Sort sessions by update time (most recent first)
    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    
    const stats: ChatHistoryStats = {
      totalSessions: sessions.length,
      totalMessages,
      totalTokensUsed: totalTokens,
      estimatedTotalCost: totalCost,
      activeConnections: 0, // Will be populated by connection manager
      uptime: process.uptime()
    }
    
    return { sessions, stats }
  } catch (error) {
    console.error('Failed to load chat history:', error)
    return {
      sessions: [],
      stats: {
        totalSessions: 0,
        totalMessages: 0,
        totalTokensUsed: 0,
        estimatedTotalCost: 0,
        activeConnections: 0,
        uptime: process.uptime()
      }
    }
  }
}

/**
 * Server-side settings data fetching
 * Reads configuration and status from various sources
 */
export async function getServerSettings(): Promise<ServerSettings> {
  try {
    // Read MCP configuration and get real-time status
    const mcpConfigPath = join(process.cwd(), 'config', 'mcp.config.json')
    let mcpServers: ServerSettings['mcpServers'] = []
    
    try {
      const mcpConfigContent = await readFile(mcpConfigPath, 'utf-8')
      const mcpConfig = JSON.parse(mcpConfigContent)
      
      if (mcpConfig.mcpServers) {
        // Try to get MCP client manager for real-time status
        let connectionStatuses: Record<string, any> = {}
        try {
          const { getMCPClientManager } = await import('./services/MCPClientManager')
          const clientManager = getMCPClientManager()
          connectionStatuses = clientManager.getConnectionStatuses()
        } catch (error) {
          console.warn('Failed to get MCP connection statuses:', error)
        }
        
        mcpServers = Object.entries(mcpConfig.mcpServers).map(([id, config]: [string, unknown]) => {
          const configObj = config as { displayName?: string; disabled?: boolean }
          const status = connectionStatuses[id]
          
          return {
            id,
            name: id,
            displayName: configObj.displayName || id,
            enabled: !configObj.disabled,
            status: status ? (status.status === 'healthy' ? 'connected' : 
                            status.status === 'unhealthy' ? 'error' : 'disconnected') : 'disconnected',
            toolCount: status?.toolCount || 0
          }
        })
      }
    } catch (error) {
      console.warn('Failed to read MCP configuration:', error)
    }
    
    // Mock LLM providers (will be replaced with actual configuration reading)
    const llmProviders: ServerSettings['llmProviders'] = [
      {
        id: 'openai',
        name: 'openai',
        displayName: 'OpenAI',
        enabled: true,
        models: [
          {
            id: 'gpt-4',
            name: 'gpt-4',
            displayName: 'GPT-4',
            supportsToolCalling: true
          },
          {
            id: 'gpt-3.5-turbo',
            name: 'gpt-3.5-turbo',
            displayName: 'GPT-3.5 Turbo',
            supportsToolCalling: true
          }
        ],
        status: 'connected'
      },
      {
        id: 'deepseek',
        name: 'deepseek',
        displayName: 'DeepSeek',
        enabled: false,
        models: [
          {
            id: 'deepseek-chat',
            name: 'deepseek-chat',
            displayName: 'DeepSeek Chat',
            supportsToolCalling: true
          }
        ],
        status: 'disconnected'
      },
      {
        id: 'openrouter',
        name: 'openrouter',
        displayName: 'OpenRouter',
        enabled: false,
        models: [
          {
            id: 'anthropic/claude-3-sonnet',
            name: 'anthropic/claude-3-sonnet',
            displayName: 'Claude 3 Sonnet',
            supportsToolCalling: true
          }
        ],
        status: 'error'
      }
    ]
    
    return {
      llmProviders,
      mcpServers,
      systemInfo: {
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      }
    }
  } catch (error) {
    console.error('Failed to load server settings:', error)
    return {
      llmProviders: [],
      mcpServers: [],
      systemInfo: {
        version: '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      }
    }
  }
}

/**
 * Get recent chat sessions for quick access
 */
export async function getRecentSessions(limit: number = 5): Promise<ChatSession[]> {
  const { sessions } = await getChatHistory()
  return sessions.slice(0, limit)
}