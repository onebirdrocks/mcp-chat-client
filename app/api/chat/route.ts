import { NextRequest, NextResponse } from 'next/server'
import { ChatRequest, ChatResponse, Message, ToolCall } from '@/lib/types'
import { getEnabledMCPServerIds } from '@/lib/mcp-utils'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'

// Mock LLM service - will be replaced with actual implementation in later tasks
class MockLLMService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async chat(messages: Message[], _model: string, _tools?: unknown[]): Promise<{
    content?: string;
    toolCalls?: ToolCall[];
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const lastMessage = messages[messages.length - 1]
    
    // Simple mock responses based on message content
    if (lastMessage.content.toLowerCase().includes('tool') || lastMessage.content.toLowerCase().includes('file')) {
      // Mock tool call response
      return {
        toolCalls: [{
          id: uuidv4(),
          type: 'function',
          function: {
            name: 'filesystem.read_file',
            arguments: JSON.stringify({ path: '/example/file.txt' })
          },
          serverId: 'filesystem'
        }],
        usage: {
          promptTokens: 50,
          completionTokens: 20,
          totalTokens: 70
        }
      }
    }
    
    // Mock text response
    return {
      content: `I understand you said: "${lastMessage.content}". This is a mock response from the chat API. The actual LLM integration will be implemented in later tasks.`,
      usage: {
        promptTokens: 30,
        completionTokens: 25,
        totalTokens: 55
      }
    }
  }
}

const mockLLMService = new MockLLMService()

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
    
    // Call LLM service
    const llmResponse = await mockLLMService.chat(body.messages, body.model, tools)
    
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}