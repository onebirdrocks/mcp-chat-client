import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimplifiedToolCallClient } from './tool-call-client-simplified';

// Mock fetch
global.fetch = vi.fn();

describe('SimplifiedToolCallClient', () => {
  let client: SimplifiedToolCallClient;

  beforeEach(() => {
    client = new SimplifiedToolCallClient();
    vi.clearAllMocks();
  });

  describe('callModelWithTools', () => {
    it('should call model with tools', async () => {
      const mockResponse = {
        success: true,
        result: {
          text: 'I will help you find ebooks',
          toolCalls: [
            {
              toolCallId: '1',
              toolName: 'get_all_pdf_files',
              input: { path: '/Users/onebird/Downloads' }
            }
          ]
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.callModelWithTools(
        'openrouter',
        'openai/gpt-4o',
        '帮我看一下/Users/onebird/Downloads 下有哪些电子书',
        []
      );

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/ai/tool-call-simplified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId: 'openrouter',
          modelId: 'openai/gpt-4o',
          prompt: '帮我看一下/Users/onebird/Downloads 下有哪些电子书',
          historyMessages: [],
          stream: false
        }),
      });
    });

    it('should handle errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(client.callModelWithTools(
        'openrouter',
        'openai/gpt-4o',
        'test',
        []
      )).rejects.toThrow('HTTP error! status: 500');
    });
  });

  describe('executeToolCalls', () => {
    it('should execute tool calls successfully', async () => {
      const mockResponse = {
        results: [
          {
            toolCallId: '1',
            success: true,
            result: ['file1.pdf', 'file2.epub']
          }
        ]
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const toolCalls = [
        {
          id: '1',
          toolName: 'get_all_pdf_files',
          input: { path: '/Users/onebird/Downloads' }
        }
      ];

      const result = await client.executeToolCalls(toolCalls);

      expect(result).toEqual([
        {
          toolCallId: '1',
          success: true,
          result: ['file1.pdf', 'file2.epub']
        }
      ]);
    });

    it('should handle tool execution errors', async () => {
      const mockResponse = {
        results: [
          {
            toolCallId: '1',
            success: false,
            error: 'Tool not found'
          }
        ]
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const toolCalls = [
        {
          id: '1',
          toolName: 'invalid_tool',
          input: {}
        }
      ];

      const result = await client.executeToolCalls(toolCalls);

      expect(result).toEqual([
        {
          toolCallId: '1',
          success: false,
          error: 'Tool not found'
        }
      ]);
    });
  });

  describe('continueConversationWithToolResults', () => {
    it('should continue conversation with tool results', async () => {
      const mockResponse = {
        success: true,
        result: {
          text: 'I found 2 ebooks in your Downloads folder: file1.pdf and file2.epub'
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const toolResults = [
        {
          toolCallId: '1',
          success: true,
          result: ['file1.pdf', 'file2.epub']
        }
      ];

      const result = await client.continueConversationWithToolResults(
        'openrouter',
        'openai/gpt-4o',
        '请基于工具执行结果继续回答用户的问题。',
        [],
        toolResults
      );

      expect(result).toEqual(mockResponse);
    });
  });
});
