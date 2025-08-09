import { LLMService, LLMCompletionRequest, LLMCompletionResponse } from './LLMService';
import { SessionManager } from './SessionManager';
import { Message, ToolCall, LLMProvider, MCPTool } from '@/types';
import { ValidationError, InternalServerError } from '@/lib/errors';

export interface ProcessQueryRequest {
  messages: Message[];
  sessionId: string;
  provider: LLMProvider;
  model: string;
  availableTools?: MCPTool[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ProcessQueryResponse {
  reply?: string;
  toolCalls?: ToolCall[];
  sessionId: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface StreamingProcessQueryResponse extends ProcessQueryResponse {
  isStreaming: boolean;
  streamId?: string;
}

export class ChatProcessor {
  private llmService: LLMService;
  private sessionManager: SessionManager;

  constructor(llmService: LLMService, sessionManager: SessionManager) {
    this.llmService = llmService;
    this.sessionManager = sessionManager;
  }

  /**
   * Process a chat query with full message history management and tool call detection
   */
  async processQuery(request: ProcessQueryRequest): Promise<ProcessQueryResponse> {
    try {
      // Validate the request
      this.validateProcessQueryRequest(request);

      // Get or create session
      let session;
      try {
        session = await this.sessionManager.getSession(request.sessionId);
      } catch (error) {
        // If session doesn't exist, create a new one
        session = await this.sessionManager.createSession(
          request.provider,
          request.model,
          [], // MCP servers will be added later
          request.messages[0] // First message as initial message
        );
      }

      // Construct the complete message history with system prompt
      const messageHistory = this.constructMessageHistory(
        request.messages,
        request.systemPrompt,
        request.availableTools
      );

      // Prepare LLM completion request
      const llmRequest: LLMCompletionRequest = {
        messages: messageHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
          tool_calls: msg.toolCalls,
          tool_call_id: msg.toolCallId,
        })),
        model: request.model,
        temperature: request.temperature ?? 0.7,
        maxTokens: request.maxTokens ?? 1000,
      };

      // Add tools if available
      if (request.availableTools && request.availableTools.length > 0) {
        llmRequest.tools = this.formatToolsForLLM(request.availableTools);
        llmRequest.toolChoice = 'auto';
      }

      // Generate completion
      const completion = await this.llmService.generateCompletion(llmRequest);

      // Process the response
      const response: ProcessQueryResponse = {
        sessionId: request.sessionId,
        reply: completion.content,
        toolCalls: completion.toolCalls,
        usage: completion.usage,
        finishReason: completion.finishReason,
      };

      // Update session with new messages
      await this.updateSessionWithResponse(request.sessionId, request.messages, completion);

      return response;
    } catch (error) {
      console.error('Chat processing error:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new InternalServerError(`Failed to process chat query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a streaming chat query (placeholder for future streaming implementation)
   */
  async processStreamingQuery(request: ProcessQueryRequest): Promise<AsyncGenerator<StreamingProcessQueryResponse, void, unknown>> {
    // For now, return a generator that yields the complete response
    // This can be enhanced later to support true streaming
    const response = await this.processQuery(request);
    
    async function* streamGenerator(): AsyncGenerator<StreamingProcessQueryResponse, void, unknown> {
      yield {
        ...response,
        isStreaming: true,
        streamId: `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
    }

    return streamGenerator();
  }

  /**
   * Construct system prompt based on available tools and context
   */
  constructSystemPrompt(availableTools?: MCPTool[], customPrompt?: string): string {
    const basePrompt = customPrompt || `You are a helpful AI assistant with access to various tools through the Model Context Protocol (MCP). 

When you need to use a tool to help the user, you should:
1. Explain what you're going to do
2. Call the appropriate tool with the correct parameters
3. Wait for the tool result
4. Interpret and explain the results to the user

Always be clear about what tools you're using and why. If a tool call fails, explain the error and suggest alternatives if possible.`;

    if (!availableTools || availableTools.length === 0) {
      return basePrompt;
    }

    const toolDescriptions = availableTools
      .map(tool => `- ${tool.name}: ${tool.description}`)
      .join('\n');

    return `${basePrompt}

Available tools:
${toolDescriptions}

Use these tools when they can help answer the user's questions or complete their requests.`;
  }

  /**
   * Construct complete message history with system prompt
   */
  private constructMessageHistory(
    messages: Message[],
    systemPrompt?: string,
    availableTools?: MCPTool[]
  ): Message[] {
    const history: Message[] = [];

    // Add system prompt if provided or if tools are available
    if (systemPrompt || (availableTools && availableTools.length > 0)) {
      const finalSystemPrompt = this.constructSystemPrompt(availableTools, systemPrompt);
      history.push({
        id: `system_${Date.now()}`,
        role: 'system',
        content: finalSystemPrompt,
        timestamp: new Date(),
      });
    }

    // Add all user messages, maintaining conversation flow
    history.push(...messages);

    return history;
  }

  /**
   * Format MCP tools for LLM API
   */
  private formatToolsForLLM(tools: MCPTool[]): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: object;
    };
  }> {
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  /**
   * Update session with new messages and LLM response
   */
  private async updateSessionWithResponse(
    sessionId: string,
    userMessages: Message[],
    completion: LLMCompletionResponse
  ): Promise<void> {
    try {
      // Add user messages to session
      for (const message of userMessages) {
        await this.sessionManager.addMessage(sessionId, message);
      }

      // Add assistant response
      if (completion.content || completion.toolCalls) {
        const assistantMessage: Message = {
          id: `assistant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: completion.content || '',
          timestamp: new Date(),
          toolCalls: completion.toolCalls,
        };

        await this.sessionManager.addMessage(sessionId, assistantMessage);
      }

      // Generate session title if this is a new conversation
      const session = await this.sessionManager.getSession(sessionId);
      if (session.title === 'New Chat' && session.messages.length >= 2) {
        try {
          await this.sessionManager.generateSessionTitle(sessionId, this.llmService);
        } catch (error) {
          console.warn('Failed to generate session title:', error);
          // Continue without failing the entire request
        }
      }
    } catch (error) {
      console.error('Failed to update session:', error);
      // Don't throw here as the main processing was successful
    }
  }

  /**
   * Validate process query request
   */
  private validateProcessQueryRequest(request: ProcessQueryRequest): void {
    if (!request.messages || !Array.isArray(request.messages)) {
      throw new ValidationError('Messages must be an array');
    }

    if (request.messages.length === 0) {
      throw new ValidationError('Messages array cannot be empty');
    }

    if (!request.sessionId || typeof request.sessionId !== 'string') {
      throw new ValidationError('Session ID must be a valid string');
    }

    if (!request.provider || !['openai', 'deepseek', 'openrouter'].includes(request.provider)) {
      throw new ValidationError('Provider must be one of: openai, deepseek, openrouter');
    }

    if (!request.model || typeof request.model !== 'string') {
      throw new ValidationError('Model must be a valid string');
    }

    // Validate each message
    request.messages.forEach((message, index) => {
      if (!message.id || typeof message.id !== 'string') {
        throw new ValidationError(`Message at index ${index} must have a valid id`);
      }
      
      if (!message.role || !['user', 'assistant', 'tool', 'system'].includes(message.role)) {
        throw new ValidationError(`Message at index ${index} must have a valid role`);
      }
      
      if (typeof message.content !== 'string') {
        throw new ValidationError(`Message at index ${index} must have string content`);
      }
    });

    // Validate optional parameters
    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
      throw new ValidationError('Temperature must be between 0 and 2');
    }

    if (request.maxTokens !== undefined && request.maxTokens <= 0) {
      throw new ValidationError('Max tokens must be positive');
    }
  }

  /**
   * Detect if a message contains tool calls that need confirmation
   */
  static detectToolCalls(message: Message): ToolCall[] {
    return message.toolCalls || [];
  }

  /**
   * Format tool call for user confirmation
   */
  static formatToolCallForConfirmation(toolCall: ToolCall): {
    name: string;
    description: string;
    parameters: Record<string, any>;
  } {
    let parameters: Record<string, any> = {};
    
    try {
      parameters = JSON.parse(toolCall.function.arguments);
    } catch (error) {
      console.warn('Failed to parse tool call arguments:', error);
      parameters = { raw_arguments: toolCall.function.arguments };
    }

    return {
      name: toolCall.function.name,
      description: `Execute ${toolCall.function.name} with the provided parameters`,
      parameters,
    };
  }

  /**
   * Create a tool result message
   */
  static createToolResultMessage(
    toolCallId: string,
    result: string,
    isError: boolean = false
  ): Message {
    return {
      id: `tool_result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'tool',
      content: isError ? `Error: ${result}` : result,
      timestamp: new Date(),
      toolCallId,
    };
  }
}

/**
 * Factory function to create ChatProcessor instances
 */
export function createChatProcessor(
  llmService: LLMService,
  sessionManager: SessionManager
): ChatProcessor {
  return new ChatProcessor(llmService, sessionManager);
}

/**
 * Utility function to extract the last user message from a conversation
 */
export function getLastUserMessage(messages: Message[]): Message | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i];
    }
  }
  return null;
}

/**
 * Utility function to count tokens in messages (rough estimation)
 */
export function estimateTokenCount(messages: Message[]): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  return Math.ceil(totalChars / 4);
}

/**
 * Utility function to truncate message history to fit within token limits
 */
export function truncateMessageHistory(
  messages: Message[],
  maxTokens: number,
  preserveSystemMessage: boolean = true
): Message[] {
  if (messages.length === 0) return messages;

  let truncatedMessages = [...messages];
  let currentTokens = estimateTokenCount(truncatedMessages);

  // Always preserve the system message if requested
  const systemMessageIndex = preserveSystemMessage 
    ? truncatedMessages.findIndex(msg => msg.role === 'system')
    : -1;

  // Remove messages from the middle (keeping recent context) until under limit
  while (currentTokens > maxTokens && truncatedMessages.length > 1) {
    // Find the oldest non-system message to remove
    let indexToRemove = -1;
    for (let i = 0; i < truncatedMessages.length; i++) {
      if (i !== systemMessageIndex && truncatedMessages[i].role !== 'system') {
        indexToRemove = i;
        break;
      }
    }

    if (indexToRemove === -1) break; // No more messages to remove

    truncatedMessages.splice(indexToRemove, 1);
    currentTokens = estimateTokenCount(truncatedMessages);
  }

  return truncatedMessages;
}