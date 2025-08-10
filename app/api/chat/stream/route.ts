import { NextRequest, NextResponse } from 'next/server'
import { ChatRequest } from '@/lib/types'
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
    
    // Initialize LLM service
    const llmService = getLLMService()
    await llmService.initialize()
    
    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder()
    const messageId = uuidv4()
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial metadata
          const initialData = {
            type: 'start',
            sessionId: body.sessionId,
            messageId,
            timestamp: new Date().toISOString()
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`))
          
          // Stream LLM response
          for await (const chunk of llmService.chatStream(body.provider, {
            messages: body.messages,
            model: body.model,
            temperature: body.temperature,
            tools: tools.length > 0 ? tools : undefined
          })) {
            if (chunk.toolCalls) {
              // Send tool calls for confirmation
              const toolCallData = {
                type: 'tool_calls',
                toolCalls: chunk.toolCalls,
                sessionId: body.sessionId,
                messageId,
                usage: chunk.usage
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(toolCallData)}\n\n`))
            } else if (chunk.content) {
              // Send content chunk
              const contentData = {
                type: 'content',
                content: chunk.content,
                sessionId: body.sessionId,
                messageId
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(contentData)}\n\n`))
            }
            
            if (chunk.done) {
              // Send completion data
              const doneData = {
                type: 'done',
                sessionId: body.sessionId,
                messageId,
                usage: chunk.usage
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneData)}\n\n`))
              break
            }
          }
          
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          
          let errorMessage = 'Internal server error'
          if (error instanceof ValidationError) {
            errorMessage = error.message
          } else if (error instanceof InternalServerError) {
            errorMessage = error.message
          }
          
          const errorData = {
            type: 'error',
            error: errorMessage,
            sessionId: body.sessionId,
            messageId
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`))
          controller.close()
        }
      }
    })
    
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
    
  } catch (error) {
    console.error('Streaming chat API error:', error)
    
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