import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ToolExecutionService } from '../ToolExecutionService';
import { MCPClientManager } from '../MCPClientManager';
import { SessionManager } from '../SessionManager';
import { LLMService } from '../LLMService';
import { ToolCall, Message, MCPTool, RunToolRequest } from '@/types';
import { ValidationError } from '@/lib/errors';

// Mock dependencies
vi.mock('../MCPClientManager');
vi.mock('../SessionManager');
vi.mock('../LLMService');

describe('ToolExecutionService', () => {
  let toolExecutionService: ToolExecutionService;
  let mockMCPManager: vi.Mocked<MCPClientManager>;
  let mockSessionManager: vi.Mocked<SessionManager>;
  let mockLLMService: vi.Mocked<LLMService>;

  const mockTool: MCPTool = {
    name: 'test_tool',
    description: 'A test tool',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', minLength: 1, maxLength: 100 },
        count: { type: 'number', minimum: 1, maximum: 10 }
      },
      required: ['message']
    },
    serverId: 'test-server'
  };

  const mockToolCall: ToolCall = {
    id: 'test-call-123',
    type: 'function',
    function: {
      name: 'test_tool',
      arguments: JSON.stringify({ message: 'Hello', count: 5 })
    }
  };

  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Please run the test tool',
      timestamp: new Date()
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mocked instances
    mockMCPManager = {
      getAllTools: vi.fn(),
      getServerTools: vi.fn(),
      executeTool: vi.fn(),
      connectServer: vi.fn(),
      disconnectServer: vi.fn(),
      reconnectServer: vi.fn(),
      getConnectionStatuses: vi.fn(),
      updateServerConfigs: vi.fn(),
      shutdown: vi.fn()
    } as any;

    mockSessionManager = {
      addMessage: vi.fn(),
      getSession: vi.fn(),
      createSession: vi.fn(),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      listSessions: vi.fn(),
      generateSessionTitle: vi.fn()
    } as any;

    mockLLMService = {
      generateResponse: vi.fn(),
      streamResponse: vi.fn(),
      validateApiKey: vi.fn()
    } as any;

    toolExecutionService = new ToolExecutionService(
      mockMCPManager,
      mockSessionManager,
      mockLLMService
    );
  });

  describe('validateToolParameters', () => {
    it('should validate parameters successfully with valid input', async () => {
      mockMCPManager.getAllTools.mockReturnValue([mockTool]);

      const result = await toolExecutionService.validateToolParameters(
        'test_tool',
        { message: 'Hello', count: 5 }
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedParameters).toEqual({ message: 'Hello', count: 5 });
    });

    it('should fail validation for missing required parameters', async () => {
      mockMCPManager.getAllTools.mockReturnValue([mockTool]);

      const result = await toolExecutionService.validateToolParameters(
        'test_tool',
        { count: 5 } // missing required 'message'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required property: message');
    });

    it('should fail validation for wrong parameter types', async () => {
      mockMCPManager.getAllTools.mockReturnValue([mockTool]);

      const result = await toolExecutionService.validateToolParameters(
        'test_tool',
        { message: 123, count: 'invalid' } // wrong types
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Property "message" should be of type string, got number');
      expect(result.errors).toContain('Property "count" should be of type number, got string');
    });

    it('should fail validation for unknown tool', async () => {
      mockMCPManager.getAllTools.mockReturnValue([]);

      const result = await toolExecutionService.validateToolParameters(
        'unknown_tool',
        { message: 'Hello' }
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tool "unknown_tool" not found in any connected MCP server');
    });

    it('should detect security issues in parameters', async () => {
      mockMCPManager.getAllTools.mockReturnValue([mockTool]);

      const result = await toolExecutionService.validateToolParameters(
        'test_tool',
        { message: '../../../etc/passwd', count: 1 }
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('dangerous pattern'))).toBe(true);
    });

    it('should truncate overly long strings', async () => {
      const toolWithMaxLength: MCPTool = {
        ...mockTool,
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', maxLength: 10 }
          },
          required: ['message']
        }
      };

      mockMCPManager.getAllTools.mockReturnValue([toolWithMaxLength]);

      const result = await toolExecutionService.validateToolParameters(
        'test_tool',
        { message: 'This is a very long message that exceeds the limit' }
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Property "message" should be at most 10 characters long');
    });
  });

  describe('executeTool', () => {
    const mockContext = {
      sessionId: 'session-123',
      messages: mockMessages,
      toolCall: mockToolCall
    };

    it('should execute tool successfully', async () => {
      mockMCPManager.getAllTools.mockReturnValue([mockTool]);
      mockMCPManager.executeTool.mockResolvedValue({
        content: [{ type: 'text', text: 'Tool executed successfully' }]
      });

      const result = await toolExecutionService.executeTool(mockContext);

      expect(result.success).toBe(true);
      expect(result.toolOutput).toBe('Tool executed successfully');
      expect(result.error).toBeUndefined();
      expect(mockMCPManager.executeTool).toHaveBeenCalledWith(
        'test_tool',
        { message: 'Hello', count: 5 }
      );
    });

    it('should handle tool execution failure', async () => {
      mockMCPManager.getAllTools.mockReturnValue([mockTool]);
      mockMCPManager.executeTool.mockRejectedValue(new Error('Tool execution failed'));

      const result = await toolExecutionService.executeTool(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tool execution failed');
      expect(result.toolOutput).toBeUndefined();
    });

    it('should handle invalid JSON arguments', async () => {
      const invalidContext = {
        ...mockContext,
        toolCall: {
          ...mockToolCall,
          function: {
            ...mockToolCall.function,
            arguments: 'invalid json'
          }
        }
      };

      const result = await toolExecutionService.executeTool(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid tool arguments JSON');
    });

    it('should handle parameter validation failure', async () => {
      mockMCPManager.getAllTools.mockReturnValue([]);

      const result = await toolExecutionService.executeTool(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool parameter validation failed');
    });
  });

  describe('processToolExecution', () => {
    const mockRequest: RunToolRequest = {
      toolCall: mockToolCall,
      sessionId: 'session-123',
      messages: mockMessages
    };

    it('should process successful tool execution', async () => {
      mockMCPManager.getAllTools.mockReturnValue([mockTool]);
      mockMCPManager.executeTool.mockResolvedValue({
        content: [{ type: 'text', text: 'Success result' }]
      });
      mockSessionManager.addMessage.mockResolvedValue();

      const result = await toolExecutionService.processToolExecution(mockRequest);

      expect(result.result).toBe('Success result');
      expect(result.reply).toContain('successfully executed');
      expect(result.error).toBeUndefined();
      expect(mockSessionManager.addMessage).toHaveBeenCalledTimes(2); // tool result + AI response
    });

    it('should handle tool execution failure gracefully', async () => {
      mockMCPManager.getAllTools.mockReturnValue([mockTool]);
      mockMCPManager.executeTool.mockRejectedValue(new Error('Execution failed'));
      mockSessionManager.addMessage.mockResolvedValue();

      const result = await toolExecutionService.processToolExecution(mockRequest);

      expect(result.result).toBe('');
      expect(result.reply).toContain('error');
      expect(result.error).toBe('Execution failed');
      expect(mockSessionManager.addMessage).toHaveBeenCalledTimes(1); // only error message
    });

    it('should handle session manager errors', async () => {
      mockMCPManager.getAllTools.mockReturnValue([mockTool]);
      mockMCPManager.executeTool.mockResolvedValue({
        content: [{ type: 'text', text: 'Success result' }]
      });
      mockSessionManager.addMessage.mockRejectedValue(new Error('Session error'));

      const result = await toolExecutionService.processToolExecution(mockRequest);

      expect(result.result).toBe('Success result');
      expect(result.reply).toContain('issue generating a response');
      expect(result.error).toBe('Session error');
    });
  });

  describe('getAvailableTools', () => {
    it('should return all available tools', () => {
      const tools = [mockTool];
      mockMCPManager.getAllTools.mockReturnValue(tools);

      const result = toolExecutionService.getAvailableTools();

      expect(result).toEqual(tools);
      expect(mockMCPManager.getAllTools).toHaveBeenCalled();
    });
  });

  describe('getServerTools', () => {
    it('should return tools for specific server', () => {
      const tools = [mockTool];
      mockMCPManager.getServerTools.mockReturnValue(tools);

      const result = toolExecutionService.getServerTools('test-server');

      expect(result).toEqual(tools);
      expect(mockMCPManager.getServerTools).toHaveBeenCalledWith('test-server');
    });
  });

  describe('isToolAvailable', () => {
    it('should return true for available tool', () => {
      mockMCPManager.getAllTools.mockReturnValue([mockTool]);

      const result = toolExecutionService.isToolAvailable('test_tool');

      expect(result).toBe(true);
    });

    it('should return false for unavailable tool', () => {
      mockMCPManager.getAllTools.mockReturnValue([]);

      const result = toolExecutionService.isToolAvailable('unknown_tool');

      expect(result).toBe(false);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle null/undefined parameters gracefully', async () => {
      mockMCPManager.getAllTools.mockReturnValue([mockTool]);

      const result = await toolExecutionService.validateToolParameters(
        'test_tool',
        null
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tool parameters must be a valid object');
    });

    it('should handle MCP result processing edge cases', async () => {
      mockMCPManager.getAllTools.mockReturnValue([mockTool]);
      
      // Test with null result
      mockMCPManager.executeTool.mockResolvedValue(null);

      const result = await toolExecutionService.executeTool({
        sessionId: 'session-123',
        messages: mockMessages,
        toolCall: mockToolCall
      });

      expect(result.success).toBe(true);
      expect(result.toolOutput).toBe('Tool executed successfully (no output)');
    });

    it('should handle complex nested objects in parameters', async () => {
      const complexTool: MCPTool = {
        name: 'complex_tool',
        description: 'A complex tool',
        inputSchema: {
          type: 'object',
          properties: {
            config: {
              type: 'object',
              properties: {
                nested: { type: 'string' }
              }
            }
          }
        },
        serverId: 'test-server'
      };

      mockMCPManager.getAllTools.mockReturnValue([complexTool]);

      const result = await toolExecutionService.validateToolParameters(
        'complex_tool',
        { config: { nested: 'value', dangerous: '../../../etc/passwd' } }
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('dangerous pattern'))).toBe(true);
    });
  });
});