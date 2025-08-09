import { NextRequest, NextResponse } from 'next/server'
import { ChatRequest, ChatResponse } from '@/lib/types'
import { getEnabledMCPServerIds } from '@/lib/mcp-utils'
import { getLLMService } from '@/lib/services'
import { getMCPClientManager } from '@/lib/services'
import { ValidationError, InternalServerError } from '@/backend/src/lib/errors'
import { v4 as uuidv4 } from 'uuid'
import { 
  withSecurity, 
  validateRequestBody, 
  ValidationSchemas, 
  createErrorResponse, 
  createSuccessResponse,
  logApiCall,
  logApiResponse,
  logSecurityEvent
} from '../index'

export const runtime = 'nodejs'

async function chatHandler(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Log the API call for audit purposes
    await logApiCall(request, '/api/chat', {
      timestamp: new Date().toISOString(),
    });

    // Parse and validate request body using security middleware
    const body: ChatRequest = await request.json()
    
    // Additional validation using our security schemas
    const messageValidation = ValidationSchemas.chatMessage.safeParse({
      content: body.messages[body.messages.length - 1]?.content || '',
      role: body.messages[body.messages.length - 1]?.role || 'user',
      sessionId: body.sessionId,
    });

    if (!messageValidation.success) {
      await logSecurityEvent('validation_error', {
        error: messageValidation.error.message,
        endpoint: '/api/chat',
      }, request);
      return createErrorResponse('Invalid message format', 400);
    }
    
    // Validate required fields with enhanced error reporting
    if (!body.messages || !Array.isArray(body.messages)) {
      await logSecurityEvent('validation_error', {
        error: 'Messages array is required',
        endpoint: '/api/chat',
      }, request);
      return createErrorResponse('Messages array is required', 400);
    }
    
    if (!body.sessionId) {
      await logSecurityEvent('validation_error', {
        error: 'Session ID is required',
        endpoint: '/api/chat',
      }, request);
      return createErrorResponse('Session ID is required', 400);
    }
    
    if (!body.provider || !body.model) {
      await logSecurityEvent('validation_error', {
        error: 'Provider and model are required',
        endpoint: '/api/chat',
      }, request);
      return createErrorResponse('Provider and model are required', 400);
    }
    
    // Get enabled MCP servers
    const enabledMCPServers = await getEnabledMCPServerIds()
    const allowedServers = body.mcpServers?.filter(serverId => 
      enabledMCPServers.includes(serverId)
    ) || []
    
    // Log MCP server usage for audit
    if (allowedServers.length > 0) {
      await logSecurityEvent('mcp_servers_requested', {
        requestedServers: body.mcpServers,
        allowedServers,
        sessionId: body.sessionId,
      }, request);
    }
    
    // Get available tools from MCP servers
    let tools: any[] = []
    if (allowedServers.length > 0) {
      try {
        const mcpManager = getMCPClientManager()
        await mcpManager.initialize()
        
        // Get tools from all allowed servers
        for (const serverId of allowedServers) {
          try {
            const serverTools = await mcpManager.listTools(serverId)
            const formattedTools = serverTools.map((tool: any) => ({
              type: 'function',
              function: {
                name: `${serverId}.${tool.name}`,
                description: tool.description,
                parameters: tool.inputSchema
              }
            }))
            tools.push(...formattedTools)
          } catch (serverError) {
            await logSecurityEvent('mcp_server_error', {
              serverId,
              error: serverError instanceof Error ? serverError.message : 'Unknown error',
              sessionId: body.sessionId,
            }, request);
          }
        }
      } catch (error) {
        await logSecurityEvent('mcp_initialization_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          sessionId: body.sessionId,
        }, request);
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
      // Log tool call requests for audit
      await logSecurityEvent('tool_calls_requested', {
        toolCalls: llmResponse.toolCalls.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          // Don't log arguments as they might contain sensitive data
        })),
        sessionId: body.sessionId,
      }, request);
      
      // Return tool calls for user confirmation
      response.toolCalls = llmResponse.toolCalls
    } else if (llmResponse.content) {
      // Return text response
      response.reply = llmResponse.content
    } else {
      await logSecurityEvent('llm_no_response', {
        provider: body.provider,
        model: body.model,
        sessionId: body.sessionId,
      }, request);
      return createErrorResponse('No response generated', 500);
    }
    
    // Log successful response
    const duration = Date.now() - startTime;
    await logApiResponse(request, 200, duration, {
      sessionId: body.sessionId,
      hasToolCalls: !!response.toolCalls,
      toolCount: response.toolCalls?.length || 0,
    });
    
    return createSuccessResponse(response);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('Chat API error:', error)
    
    // Log the error for security monitoring
    await logSecurityEvent('api_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/chat',
      duration,
    }, request);
    
    await logApiResponse(request, 500, duration);
    
    if (error instanceof ValidationError) {
      return createErrorResponse(error.message, 400);
    }
    
    if (error instanceof InternalServerError) {
      return createErrorResponse(error.message, error.statusCode);
    }
    
    return createErrorResponse('Internal server error', 500);
  }
}

// Apply security middleware with high security configuration for chat endpoint
export const POST = withSecurity(chatHandler, {
  enableRateLimit: true,        // Prevent abuse
  enableCors: true,            // Allow cross-origin requests from allowed origins
  enableSecurityHeaders: true, // Add security headers
  enableAuditLogging: true,    // Log all requests for monitoring
  enableInputValidation: true, // Validate and sanitize input
});