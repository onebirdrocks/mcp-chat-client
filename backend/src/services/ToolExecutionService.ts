import { MCPClientManager, getMCPClientManager } from './MCPClientManager';
import { SessionManager } from './SessionManager';
import { LLMService } from './LLMService';
import { ToolCall, Message, RunToolRequest, RunToolResponse, MCPTool } from '@/types';
import { ValidationError, ToolExecutionError } from '@/lib/errors';

export interface ToolExecutionContext {
  sessionId: string;
  messages: Message[];
  toolCall: ToolCall;
  userId?: string;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  toolOutput?: string;
}

export interface ToolValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedParameters?: any;
}

/**
 * Service responsible for tool execution with user confirmation workflow,
 * parameter validation, result processing, and conversation continuation.
 */
export class ToolExecutionService {
  private mcpManager: MCPClientManager;
  private sessionManager: SessionManager;
  private llmService: LLMService;
  private pendingExecutions = new Map<string, ToolExecutionContext>();

  constructor(
    mcpManager?: MCPClientManager,
    sessionManager?: SessionManager,
    llmService?: LLMService
  ) {
    this.mcpManager = mcpManager || getMCPClientManager();
    this.sessionManager = sessionManager || new SessionManager();
    this.llmService = llmService || new LLMService();
  }

  /**
   * Validate tool parameters against the tool's input schema
   */
  async validateToolParameters(toolName: string, parameters: any): Promise<ToolValidationResult> {
    try {
      // Get the tool definition from available tools
      const availableTools = this.mcpManager.getAllTools();
      const tool = availableTools.find(t => t.name === toolName);

      if (!tool) {
        return {
          isValid: false,
          errors: [`Tool "${toolName}" not found in any connected MCP server`],
        };
      }

      const errors: string[] = [];
      let sanitizedParameters = parameters;

      // Basic parameter validation
      if (typeof parameters !== 'object' || parameters === null) {
        errors.push('Tool parameters must be a valid object');
        return { isValid: false, errors };
      }

      // Validate against input schema if available
      if (tool.inputSchema && typeof tool.inputSchema === 'object') {
        const validationResult = this.validateAgainstSchema(parameters, tool.inputSchema);
        if (!validationResult.isValid) {
          errors.push(...validationResult.errors);
        } else {
          sanitizedParameters = validationResult.sanitizedData;
        }
      }

      // Additional security validations
      const securityValidation = this.validateParameterSecurity(parameters);
      if (!securityValidation.isValid) {
        errors.push(...securityValidation.errors);
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedParameters: errors.length === 0 ? sanitizedParameters : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Parameter validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Execute a tool with proper error handling and result processing
   */
  async executeTool(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const { toolCall, sessionId } = context;

    try {
      console.log(`Executing tool: ${toolCall.function.name} for session: ${sessionId}`);

      // Parse tool arguments
      let parameters: any;
      try {
        parameters = JSON.parse(toolCall.function.arguments);
      } catch (error) {
        throw new ValidationError(`Invalid tool arguments JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Validate tool parameters
      const validation = await this.validateToolParameters(toolCall.function.name, parameters);
      if (!validation.isValid) {
        throw new ValidationError(`Tool parameter validation failed: ${validation.errors.join(', ')}`);
      }

      // Execute the tool using MCP client manager
      const mcpResult = await this.mcpManager.executeTool(
        toolCall.function.name,
        validation.sanitizedParameters || parameters
      );

      // Process the tool result
      const processedResult = this.processToolResult(mcpResult);

      const executionTime = Date.now() - startTime;

      console.log(`Tool execution completed in ${executionTime}ms`);

      return {
        success: true,
        result: mcpResult,
        executionTime,
        toolOutput: processedResult,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`Tool execution failed for ${toolCall.function.name}:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
        executionTime,
      };
    }
  }

  /**
   * Process the complete tool execution workflow including conversation continuation
   */
  async processToolExecution(request: RunToolRequest): Promise<RunToolResponse> {
    const { toolCall, sessionId, messages } = request;

    try {
      // Create execution context
      const context: ToolExecutionContext = {
        sessionId,
        messages,
        toolCall,
      };

      // Execute the tool
      const executionResult = await this.executeTool(context);

      if (!executionResult.success) {
        // Handle tool execution failure
        const errorResponse = await this.handleToolExecutionError(
          context,
          executionResult.error || 'Tool execution failed'
        );

        return {
          result: '',
          reply: errorResponse,
          error: executionResult.error,
        };
      }

      // Process successful tool execution
      const response = await this.handleSuccessfulToolExecution(
        context,
        executionResult
      );

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Tool execution workflow failed:`, errorMessage);

      return {
        result: '',
        reply: 'I encountered an error while executing the tool. Please try again.',
        error: errorMessage,
      };
    }
  }

  /**
   * Handle successful tool execution and generate AI response
   */
  private async handleSuccessfulToolExecution(
    context: ToolExecutionContext,
    executionResult: ToolExecutionResult
  ): Promise<RunToolResponse> {
    const { sessionId, messages, toolCall } = context;

    try {
      // Create tool result message
      const toolResultMessage: Message = {
        id: `tool_${toolCall.id}_${Date.now()}`,
        role: 'tool',
        content: executionResult.toolOutput || JSON.stringify(executionResult.result),
        timestamp: new Date(),
        toolCallId: toolCall.id,
      };

      // Add tool result to session
      await this.sessionManager.addMessage(sessionId, toolResultMessage);

      // Get updated messages for AI response
      const updatedMessages = [...messages, toolResultMessage];

      // Generate AI response based on tool result
      const aiResponse = await this.generateToolResponseContinuation(
        updatedMessages,
        toolCall,
        executionResult
      );

      // Add AI response to session
      if (aiResponse) {
        const aiMessage: Message = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
        };

        await this.sessionManager.addMessage(sessionId, aiMessage);
      }

      return {
        result: executionResult.toolOutput || JSON.stringify(executionResult.result),
        reply: aiResponse || 'Tool executed successfully.',
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to handle successful tool execution:`, errorMessage);

      return {
        result: executionResult.toolOutput || JSON.stringify(executionResult.result),
        reply: 'The tool executed successfully, but I encountered an issue generating a response.',
        error: errorMessage,
      };
    }
  }

  /**
   * Handle tool execution errors and generate appropriate response
   */
  private async handleToolExecutionError(
    context: ToolExecutionContext,
    error: string
  ): Promise<string> {
    const { sessionId, toolCall } = context;

    try {
      // Create error message
      const errorMessage: Message = {
        id: `tool_error_${toolCall.id}_${Date.now()}`,
        role: 'tool',
        content: `Error executing tool "${toolCall.function.name}": ${error}`,
        timestamp: new Date(),
        toolCallId: toolCall.id,
      };

      // Add error message to session
      await this.sessionManager.addMessage(sessionId, errorMessage);

      // Generate appropriate error response
      return this.generateErrorResponse(toolCall.function.name, error);

    } catch (sessionError) {
      console.error(`Failed to handle tool execution error:`, sessionError);
      return `I encountered an error while executing the "${toolCall.function.name}" tool: ${error}`;
    }
  }

  /**
   * Generate AI response continuation after successful tool execution
   */
  private async generateToolResponseContinuation(
    messages: Message[],
    toolCall: ToolCall,
    executionResult: ToolExecutionResult
  ): Promise<string> {
    try {
      // Create a prompt for the AI to interpret the tool result
      const systemPrompt = `You have just executed the "${toolCall.function.name}" tool. 
The tool execution was successful and returned the following result. 
Please provide a helpful response to the user based on this tool output.

Tool: ${toolCall.function.name}
Parameters: ${toolCall.function.arguments}
Execution Time: ${executionResult.executionTime}ms
Result: ${executionResult.toolOutput || JSON.stringify(executionResult.result)}

Provide a natural, helpful response that interprets and explains the tool result to the user.`;

      // Get the last user message to understand context
      const lastUserMessage = messages
        .filter(m => m.role === 'user')
        .pop();

      if (!lastUserMessage) {
        return `I successfully executed the "${toolCall.function.name}" tool. Here's what I found: ${executionResult.toolOutput || JSON.stringify(executionResult.result)}`;
      }

      // For now, return a simple response
      // In a full implementation, this would call the LLM service
      return `I successfully executed the "${toolCall.function.name}" tool. ${this.formatToolResult(executionResult)}`;

    } catch (error) {
      console.error(`Failed to generate tool response continuation:`, error);
      return `I successfully executed the "${toolCall.function.name}" tool, but encountered an issue generating a detailed response.`;
    }
  }

  /**
   * Format tool result for user presentation
   */
  private formatToolResult(executionResult: ToolExecutionResult): string {
    if (executionResult.toolOutput) {
      return executionResult.toolOutput;
    }

    if (executionResult.result) {
      // Try to format the result nicely
      if (typeof executionResult.result === 'object') {
        try {
          return JSON.stringify(executionResult.result, null, 2);
        } catch {
          return String(executionResult.result);
        }
      }
      return String(executionResult.result);
    }

    return 'The tool executed successfully.';
  }

  /**
   * Generate appropriate error response for tool failures
   */
  private generateErrorResponse(toolName: string, error: string): string {
    // Provide user-friendly error messages based on common error patterns
    if (error.includes('not found')) {
      return `I couldn't find the "${toolName}" tool. Please check that the MCP server is properly configured and connected.`;
    }

    if (error.includes('permission') || error.includes('access')) {
      return `I don't have permission to execute the "${toolName}" tool. Please check the file permissions or access rights.`;
    }

    if (error.includes('timeout')) {
      return `The "${toolName}" tool timed out. This might be due to a slow operation or network issue.`;
    }

    if (error.includes('connection')) {
      return `I couldn't connect to the MCP server to execute the "${toolName}" tool. Please check the server connection.`;
    }

    // Generic error response
    return `I encountered an error while executing the "${toolName}" tool: ${error}. Please try again or check the tool configuration.`;
  }

  /**
   * Validate parameters against JSON schema
   */
  private validateAgainstSchema(data: any, schema: any): { isValid: boolean; errors: string[]; sanitizedData?: any } {
    const errors: string[] = [];
    let sanitizedData = { ...data };

    try {
      // Basic schema validation (simplified)
      if (schema.type === 'object' && schema.properties) {
        // Check required properties
        if (schema.required && Array.isArray(schema.required)) {
          for (const requiredProp of schema.required) {
            if (!(requiredProp in data)) {
              errors.push(`Missing required property: ${requiredProp}`);
            }
          }
        }

        // Validate property types
        for (const [propName, propSchema] of Object.entries(schema.properties as Record<string, any>)) {
          if (propName in data) {
            const value = data[propName];
            const expectedType = propSchema.type;

            if (expectedType && typeof value !== expectedType) {
              errors.push(`Property "${propName}" should be of type ${expectedType}, got ${typeof value}`);
            }

            // String length validation
            if (expectedType === 'string' && typeof value === 'string') {
              if (propSchema.minLength && value.length < propSchema.minLength) {
                errors.push(`Property "${propName}" should be at least ${propSchema.minLength} characters long`);
              }
              if (propSchema.maxLength && value.length > propSchema.maxLength) {
                errors.push(`Property "${propName}" should be at most ${propSchema.maxLength} characters long`);
                // Truncate if too long
                sanitizedData[propName] = value.substring(0, propSchema.maxLength);
              }
            }

            // Number range validation
            if ((expectedType === 'number' || expectedType === 'integer') && typeof value === 'number') {
              if (propSchema.minimum !== undefined && value < propSchema.minimum) {
                errors.push(`Property "${propName}" should be at least ${propSchema.minimum}`);
              }
              if (propSchema.maximum !== undefined && value > propSchema.maximum) {
                errors.push(`Property "${propName}" should be at most ${propSchema.maximum}`);
              }
            }
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData: errors.length === 0 ? sanitizedData : undefined,
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Validate parameters for security concerns
   */
  private validateParameterSecurity(parameters: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Check for potentially dangerous patterns
      const dangerousPatterns = [
        /\.\.\//g,  // Path traversal
        /\$\(/g,    // Command substitution
        /`/g,       // Command substitution
        /\|/g,      // Pipe operations
        /;/g,       // Command chaining
        /&/g,       // Background processes
      ];

      const checkValue = (value: any, path: string = '') => {
        if (typeof value === 'string') {
          for (const pattern of dangerousPatterns) {
            if (pattern.test(value)) {
              errors.push(`Potentially dangerous pattern detected in ${path || 'parameter'}: ${pattern.source}`);
            }
          }

          // Check for excessively long strings
          if (value.length > 10000) {
            errors.push(`Parameter ${path || 'value'} is too long (${value.length} characters, max 10000)`);
          }
        } else if (typeof value === 'object' && value !== null) {
          // Recursively check object properties
          for (const [key, val] of Object.entries(value)) {
            checkValue(val, path ? `${path}.${key}` : key);
          }
        }
      };

      checkValue(parameters);

      return {
        isValid: errors.length === 0,
        errors,
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Security validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Process and format tool result for display
   */
  private processToolResult(mcpResult: any): string {
    try {
      if (!mcpResult) {
        return 'Tool executed successfully (no output)';
      }

      // Handle MCP result structure
      if (mcpResult.content && Array.isArray(mcpResult.content)) {
        // MCP returns content as an array of content blocks
        return mcpResult.content
          .map((block: any) => {
            if (block.type === 'text') {
              return block.text;
            }
            return JSON.stringify(block);
          })
          .join('\n');
      }

      if (typeof mcpResult === 'string') {
        return mcpResult;
      }

      if (typeof mcpResult === 'object') {
        return JSON.stringify(mcpResult, null, 2);
      }

      return String(mcpResult);

    } catch (error) {
      console.error('Error processing tool result:', error);
      return 'Tool executed successfully, but result formatting failed';
    }
  }

  /**
   * Get available tools from all connected MCP servers
   */
  getAvailableTools(): MCPTool[] {
    return this.mcpManager.getAllTools();
  }

  /**
   * Get tools from a specific server
   */
  getServerTools(serverId: string): MCPTool[] {
    return this.mcpManager.getServerTools(serverId);
  }

  /**
   * Check if a tool is available
   */
  isToolAvailable(toolName: string): boolean {
    const availableTools = this.getAvailableTools();
    return availableTools.some(tool => tool.name === toolName);
  }

  /**
   * Cancel a pending tool execution
   */
  async cancelToolExecution(toolCallId: string, sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`Cancelling tool execution: ${toolCallId} for session: ${sessionId}`);

      // Remove from pending executions if it exists
      const pendingKey = `${sessionId}_${toolCallId}`;
      if (this.pendingExecutions.has(pendingKey)) {
        this.pendingExecutions.delete(pendingKey);
        console.log(`Removed pending execution: ${pendingKey}`);
      }

      // Add cancellation message to session
      const cancellationMessage: Message = {
        id: `cancel_${toolCallId}_${Date.now()}`,
        role: 'system',
        content: `Tool execution ${toolCallId} was cancelled by the user.`,
        timestamp: new Date(),
        toolCallId: toolCallId,
      };

      await this.sessionManager.addMessage(sessionId, cancellationMessage);

      // Add AI response acknowledging the cancellation
      const aiResponse: Message = {
        id: `ai_cancel_${Date.now()}`,
        role: 'assistant',
        content: 'I understand you cancelled the tool execution. Is there anything else I can help you with?',
        timestamp: new Date(),
      };

      await this.sessionManager.addMessage(sessionId, aiResponse);

      return {
        success: true,
        message: `Tool execution ${toolCallId} has been cancelled successfully`,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to cancel tool execution:`, errorMessage);

      return {
        success: false,
        message: `Failed to cancel tool execution: ${errorMessage}`,
      };
    }
  }

  /**
   * Get pending tool executions for a session
   */
  getPendingExecutions(sessionId: string): ToolExecutionContext[] {
    const pending: ToolExecutionContext[] = [];
    
    for (const [key, context] of this.pendingExecutions.entries()) {
      if (context.sessionId === sessionId) {
        pending.push(context);
      }
    }

    return pending;
  }

  /**
   * Clear all pending executions for a session
   */
  clearPendingExecutions(sessionId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, context] of this.pendingExecutions.entries()) {
      if (context.sessionId === sessionId) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.pendingExecutions.delete(key));
    console.log(`Cleared ${keysToDelete.length} pending executions for session: ${sessionId}`);
  }
}

// Singleton instance
let toolExecutionService: ToolExecutionService | null = null;

/**
 * Get the singleton tool execution service instance
 */
export function getToolExecutionService(): ToolExecutionService {
  if (!toolExecutionService) {
    toolExecutionService = new ToolExecutionService();
  }
  return toolExecutionService;
}