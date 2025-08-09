import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatProcessor, createChatProcessor } from '../ChatProcessor';
import { LLMService } from '../LLMService';
import { SessionManager } from '../SessionManager';
import { Message, LLMProvider, MCPTool } from '@/types';

// Mock the dependencies
vi.mock('../LLMService');
vi.mock('../SessionManager');

describe('ChatProcessor', () => {
  let chatProcessor: ChatProcessor;
  let mockLLMService: any;
  let mockSessionManager: any;

  beforeEach(() => {
    // Create mock instances
    mockLLMService = {
      generateCompletion: vi.fn(),
      testConnection: vi.fn(),
      getProviderCapabilities: vi.fn(),
      validateApiKey: vi.fn(),
    };

    mockSessionManager = {
      getSession: vi.fn(),
      createSession: vi.fn(),
      addMessage: vi.fn(),
      updateSession: vi.fn(),
      generateSessionTitle: vi.fn(),
    };

    chatProcessor = createChatProcessor(mockLLMService, mockSessionManager);
  });

  describe('processQuery', () => {
    it('should process a simple chat query successfully', async () => {
      const messages: Message[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Hello, how are you?',
          timestamp: new Date(),
        },
      ];

      const mockSession = {
        id: 'session1',
        title: 'Test Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'openai' as LLMProvider,
        model: 'gpt-4',
        mcpServers: [],
      };

      const mockCompletion = {
        content: 'Hello! I am doing well, thank you for asking.',
        usage: {
          promptTokens: 10,
          completionTokens: 15,
          totalTokens: 25,
        },
        finishReason: 'stop' as const,
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);
      mockLLMService.generateCompletion.mockResolvedValue(mockCompletion);
      mockSessionManager.addMessage.mockResolvedValue(mockSession);

      const result = await chatProcessor.processQuery({
        messages,
        sessionId: 'session1',
        provider: 'openai',
        model: 'gpt-4',
      });

      expect(result).toEqual({
        sessionId: 'session1',
        reply: 'Hello! I am doing well, thank you for asking.',
        usage: mockCompletion.usage,
        finishReason: 'stop',
      });

      expect(mockLLMService.generateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Hello, how are you?',
            }),
          ]),
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000,
        })
      );

      expect(mockSessionManager.addMessage).toHaveBeenCalledTimes(2); // User message + assistant response
    });

    it('should handle tool calls in the response', async () => {
      const messages: Message[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'What is the weather like today?',
          timestamp: new Date(),
        },
      ];

      const mockSession = {
        id: 'session1',
        title: 'Weather Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'openai' as LLMProvider,
        model: 'gpt-4',
        mcpServers: [],
      };

      const mockToolCalls = [
        {
          id: 'call_123',
          type: 'function' as const,
          function: {
            name: 'get_weather',
            arguments: '{"location": "current"}',
          },
        },
      ];

      const mockCompletion = {
        content: 'I\'ll check the weather for you.',
        toolCalls: mockToolCalls,
        usage: {
          promptTokens: 15,
          completionTokens: 10,
          totalTokens: 25,
        },
        finishReason: 'tool_calls' as const,
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);
      mockLLMService.generateCompletion.mockResolvedValue(mockCompletion);
      mockSessionManager.addMessage.mockResolvedValue(mockSession);

      const result = await chatProcessor.processQuery({
        messages,
        sessionId: 'session1',
        provider: 'openai',
        model: 'gpt-4',
      });

      expect(result).toEqual({
        sessionId: 'session1',
        reply: 'I\'ll check the weather for you.',
        toolCalls: mockToolCalls,
        usage: mockCompletion.usage,
        finishReason: 'tool_calls',
      });
    });

    it('should create a new session if session does not exist', async () => {
      const messages: Message[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Hello!',
          timestamp: new Date(),
        },
      ];

      const mockNewSession = {
        id: 'new_session',
        title: 'New Chat',
        messages: [messages[0]],
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'openai' as LLMProvider,
        model: 'gpt-4',
        mcpServers: [],
      };

      const mockCompletion = {
        content: 'Hello there!',
        usage: {
          promptTokens: 5,
          completionTokens: 5,
          totalTokens: 10,
        },
        finishReason: 'stop' as const,
      };

      mockSessionManager.getSession.mockRejectedValue(new Error('Session not found'));
      mockSessionManager.createSession.mockResolvedValue(mockNewSession);
      mockLLMService.generateCompletion.mockResolvedValue(mockCompletion);
      mockSessionManager.addMessage.mockResolvedValue(mockNewSession);

      const result = await chatProcessor.processQuery({
        messages,
        sessionId: 'new_session',
        provider: 'openai',
        model: 'gpt-4',
      });

      expect(mockSessionManager.createSession).toHaveBeenCalledWith(
        'openai',
        'gpt-4',
        [],
        messages[0]
      );

      expect(result.sessionId).toBe('new_session');
    });

    it('should include available tools in the LLM request', async () => {
      const messages: Message[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Help me with a task',
          timestamp: new Date(),
        },
      ];

      const availableTools: MCPTool[] = [
        {
          name: 'calculator',
          description: 'Perform mathematical calculations',
          inputSchema: {
            type: 'object',
            properties: {
              expression: { type: 'string' },
            },
          },
          serverId: 'math_server',
        },
      ];

      const mockSession = {
        id: 'session1',
        title: 'Tool Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'openai' as LLMProvider,
        model: 'gpt-4',
        mcpServers: [],
      };

      const mockCompletion = {
        content: 'I can help you with calculations.',
        usage: {
          promptTokens: 20,
          completionTokens: 10,
          totalTokens: 30,
        },
        finishReason: 'stop' as const,
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);
      mockLLMService.generateCompletion.mockResolvedValue(mockCompletion);
      mockSessionManager.addMessage.mockResolvedValue(mockSession);

      await chatProcessor.processQuery({
        messages,
        sessionId: 'session1',
        provider: 'openai',
        model: 'gpt-4',
        availableTools,
      });

      expect(mockLLMService.generateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [
            {
              type: 'function',
              function: {
                name: 'calculator',
                description: 'Perform mathematical calculations',
                parameters: availableTools[0].inputSchema,
              },
            },
          ],
          toolChoice: 'auto',
        })
      );
    });
  });

  describe('constructSystemPrompt', () => {
    it('should create a basic system prompt without tools', () => {
      const prompt = chatProcessor.constructSystemPrompt();
      
      expect(prompt).toContain('helpful AI assistant');
      expect(prompt).toContain('Model Context Protocol');
      expect(prompt).not.toContain('Available tools:');
    });

    it('should include available tools in the system prompt', () => {
      const tools: MCPTool[] = [
        {
          name: 'weather',
          description: 'Get weather information',
          inputSchema: {},
          serverId: 'weather_server',
        },
        {
          name: 'calculator',
          description: 'Perform calculations',
          inputSchema: {},
          serverId: 'math_server',
        },
      ];

      const prompt = chatProcessor.constructSystemPrompt(tools);
      
      expect(prompt).toContain('Available tools:');
      expect(prompt).toContain('- weather: Get weather information');
      expect(prompt).toContain('- calculator: Perform calculations');
    });

    it('should use custom system prompt when provided', () => {
      const customPrompt = 'You are a specialized assistant for coding tasks.';
      const prompt = chatProcessor.constructSystemPrompt([], customPrompt);
      
      expect(prompt).toContain(customPrompt);
    });
  });

  describe('static utility methods', () => {
    it('should detect tool calls in messages', () => {
      const messageWithTools: Message = {
        id: 'msg1',
        role: 'assistant',
        content: 'I will help you with that.',
        timestamp: new Date(),
        toolCalls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'test_tool',
              arguments: '{}',
            },
          },
        ],
      };

      const messageWithoutTools: Message = {
        id: 'msg2',
        role: 'assistant',
        content: 'Simple response',
        timestamp: new Date(),
      };

      expect(ChatProcessor.detectToolCalls(messageWithTools)).toHaveLength(1);
      expect(ChatProcessor.detectToolCalls(messageWithoutTools)).toHaveLength(0);
    });

    it('should format tool calls for confirmation', () => {
      const toolCall = {
        id: 'call_123',
        type: 'function' as const,
        function: {
          name: 'calculator',
          arguments: '{"expression": "2 + 2"}',
        },
      };

      const formatted = ChatProcessor.formatToolCallForConfirmation(toolCall);
      
      expect(formatted.name).toBe('calculator');
      expect(formatted.parameters).toEqual({ expression: '2 + 2' });
    });

    it('should create tool result messages', () => {
      const result = ChatProcessor.createToolResultMessage('call_123', 'Result: 4');
      
      expect(result.role).toBe('tool');
      expect(result.content).toBe('Result: 4');
      expect(result.toolCallId).toBe('call_123');
    });

    it('should create error tool result messages', () => {
      const result = ChatProcessor.createToolResultMessage('call_123', 'Tool failed', true);
      
      expect(result.role).toBe('tool');
      expect(result.content).toBe('Error: Tool failed');
      expect(result.toolCallId).toBe('call_123');
    });
  });
});