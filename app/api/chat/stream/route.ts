import { NextRequest, NextResponse } from 'next/server'
import { ChatRequest, Message, ToolCall } from '@/lib/types'
import { getEnabledMCPServerIds } from '@/lib/mcp-utils'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'

// Mock streaming LLM service - will be replaced with actual implementation in later tasks
class MockStreamingLLMService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *streamChat(messages: Message[], _model: string, _tools?: unknown[]): AsyncGenerator<{
    content?: string;
    toolCalls?: ToolCall[];
    done?: boolean;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    const lastMessage = messages[messages.length - 1]
    
    // Check if this should be a tool call response
    if (lastMessage.content.toLowerCase().includes('tool') || lastMessage.content.toLowerCase().includes('file')) {
      // Return tool call immediately (no streaming for tool calls)
      yield {
        toolCalls: [{
          id: uuidv4(),
          type: 'function',
          function: {
            name: 'filesystem.read_file',
            arguments: JSON.stringify({ path: '/example/file.txt' })
          },
          serverId: 'filesystem'
        }],
        done: true,
        usage: {
          promptTokens: 50,
          completionTokens: 20,
          totalTokens: 70
        }
      }
      return
    }
    
    // Stream text response word by word
    const response = `I understand you said: "${lastMessage.content}". This is a mock streaming response from the chat API. Each word is being streamed individually to demonstrate the streaming functionality.`
    const words = response.split(' ')
    
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 100)) // Simulate network delay
      
      const isLast = i === words.length - 1
      yield {
        content: words[i] + (isLast ? '' : ' '),
        done: isLast,
        usage: isLast ? {
          promptTokens: 30,
          completionTokens: words.length,
          totalTokens: 30 + words.length
        } : undefined
      }
    }
  }
}

const mockStreamingLLMService = new MockStreamingLLMService()

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
    
    // Mock tool definitions for enabled servers
    const tools = allowedServers.map(serverId => ({
      type: 'function',
      function: {
        name: `${serverId}.example_tool`,
        description: `Example tool from ${serverId} server`,
        parameters: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'Input parameter'
            }
          },
          required: ['input']
        }
      }
    }))
    
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
          for await (const chunk of mockStreamingLLMService.streamChat(body.messages, body.model, tools)) {
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
          const errorData = {
            type: 'error',
            error: 'Internal server error',
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}