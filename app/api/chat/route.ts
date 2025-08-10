import { NextRequest, NextResponse } from 'next/server'
import { ChatRequest, ChatResponse } from '@/lib/types'
import { getEnabledMCPServerIds } from '@/lib/mcp-utils'
import { getLLMService } from '@/lib/services'
import { getMCPClientManager } from '@/lib/services'
import { ValidationError, InternalServerError } from '@/backend/src/lib/errors'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    
    // Validate required fields
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }
    
    if (!body.sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    if (!body.provider || !body.model) {
      return NextResponse.json(
        { error: 'Provider and model are required' },
        { status: 400 }
      )
    }
    
    // Get enabled MCP servers
    const enabledMCPServers = await getEnabledMCPServerIds()
    const allowedServers = body.mcpServers?.filter(serverId => 
      enabledMCPServers.includes(serverId)
    ) || []
    
    // Get available tools from MCP servers
    const tools: any[] = []
    if (allowedServers.length > 0) {
      try {
        const mcpManager = getMCPClientManager()
        await mcpManager.initialize()
        
        // Get tools from all allowed servers
        for (const serverId of allowedServers) {
          const serverTools = await mcpManager.getAvailableTools(serverId)
          const formattedTools = serverTools.map(tool => ({
            type: 'function',
            function: {
              name: `${serverId}.${tool.name}`,
              description: tool.description,
              parameters: tool.inputSchema
            }
          }))
          tools.push(...formattedTools)
        }
      } catch (error) {
        console.warn('Failed to get MCP tools:', error)
        // Continue without tools if MCP servers are unavailable
      }
    }
    
    // Initialize and call LLM service
    const llmService = getLLMService()
    await llmService.initialize()
    
    const llmResponse = await llmService.chat(body.provider, {
      messages: body.messages,
      model: body.model,
      temperature: body.temperature,
      tools: tools.length > 0 ? tools : undefined
    })
    
    const messageId = uuidv4()
    
    // Prepare response
    const response: ChatResponse = {
      sessionId: body.sessionId,
      messageId,
      usage: llmResponse.usage
    }
    
    if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      // Return tool calls for user confirmation
      response.toolCalls = llmResponse.toolCalls
    } else if (llmResponse.content) {
      // Return text response
      response.reply = llmResponse.content
    } else {
      return NextResponse.json(
        { error: 'No response generated' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Chat API error:', error)
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    if (error instanceof InternalServerError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}