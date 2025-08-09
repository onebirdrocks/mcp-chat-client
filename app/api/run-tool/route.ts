import { NextRequest, NextResponse } from 'next/server'
import { RunToolRequest, RunToolResponse, Message } from '@/lib/types'
import { getMCPServerConfig } from '@/lib/mcp-utils'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'

// Mock MCP client manager - will be replaced with actual implementation in later tasks
class MockMCPClientManager {
  async executeTool(serverId: string, toolName: string, args: unknown): Promise<{
    result: string;
    executionTime: number;
    error?: string;
  }> {
    // Simulate tool execution delay
    const startTime = Date.now()
    await new Promise(resolve => setTimeout(resolve, 1000))
    const executionTime = Date.now() - startTime
    
    // Mock different tool responses
    if (toolName.includes('read_file')) {
      const argsObj = args as { path?: string }
      return {
        result: JSON.stringify({
          content: 'This is mock file content from the filesystem tool.',
          path: argsObj.path || '/example/file.txt',
          size: 1024
        }),
        executionTime
      }
    }
    
    if (toolName.includes('error')) {
      return {
        result: '',
        executionTime,
        error: 'Mock tool execution error'
      }
    }
    
    // Default mock response
    return {
      result: JSON.stringify({
        message: `Tool ${toolName} executed successfully`,
        serverId,
        arguments: args,
        timestamp: new Date().toISOString()
      }),
      executionTime
    }
  }
}

// Mock LLM service for continuation after tool execution
class MockLLMService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async continueConversation(messages: Message[], toolResult: string, _model: string): Promise<{
    content: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    return {
      content: `I've executed the tool and received the following result: ${toolResult}. This is a mock continuation response that will be replaced with actual LLM integration in later tasks.`,
      usage: {
        promptTokens: 40,
        completionTokens: 30,
        totalTokens: 70
      }
    }
  }
}

const mockMCPClient = new MockMCPClientManager()
const mockLLMService = new MockLLMService()

export async function POST(request: NextRequest) {
  try {
    const body: RunToolRequest = await request.json()
    
    // Validate required fields
    if (!body.toolCall) {
      return NextResponse.json(
        { error: 'Tool call is required' },
        { status: 400 }
      )
    }
    
    if (!body.sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }
    
    if (!body.approved) {
      // Tool execution was not approved
      return NextResponse.json({
        result: 'Tool execution cancelled by user',
        reply: 'I understand you chose not to execute the tool. How else can I help you?',
        executionTime: 0,
        messageId: uuidv4()
      } as RunToolResponse)
    }
    
    const { toolCall } = body
    
    // Parse tool name to extract serverId and toolName
    const fullToolName = toolCall.function.name
    const [serverId, ...toolNameParts] = fullToolName.split('.')
    const toolName = toolNameParts.join('.')
    
    if (!serverId || !toolName) {
      return NextResponse.json(
        { error: 'Invalid tool name format. Expected: serverId.toolName' },
        { status: 400 }
      )
    }
    
    // Verify server is configured and enabled
    const serverConfig = await getMCPServerConfig(serverId)
    if (!serverConfig || serverConfig.disabled) {
      return NextResponse.json(
        { error: `MCP server '${serverId}' is not available or disabled` },
        { status: 400 }
      )
    }
    
    // Parse tool arguments
    let toolArguments: unknown
    try {
      toolArguments = JSON.parse(toolCall.function.arguments)
    } catch {
      return NextResponse.json(
        { error: 'Invalid tool arguments JSON' },
        { status: 400 }
      )
    }
    
    // Execute the tool
    const toolExecution = await mockMCPClient.executeTool(serverId, toolName, toolArguments)
    
    if (toolExecution.error) {
      return NextResponse.json({
        result: '',
        error: toolExecution.error,
        executionTime: toolExecution.executionTime,
        messageId: uuidv4()
      } as RunToolResponse)
    }
    
    // Get LLM continuation with tool result
    const continuation = await mockLLMService.continueConversation(
      body.messages,
      toolExecution.result,
      'mock-model'
    )
    
    const response: RunToolResponse = {
      result: toolExecution.result,
      reply: continuation.content,
      executionTime: toolExecution.executionTime,
      messageId: uuidv4(),
      usage: continuation.usage
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Run tool API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}