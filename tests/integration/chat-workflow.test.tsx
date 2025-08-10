/**
 * Integration tests for complete chat workflows
 * Tests the full chat flow from user input to AI response
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '@/src/components/ChatInterface';
import { ClientProviders } from '@/app/components/ClientProviders';
import { useChatStore } from '@/src/store/chatStore';
import * as apiClient from '@/src/services/apiClient';

// Mock API client
vi.mock('@/src/services/apiClient');

const mockApiClient = vi.mocked(apiClient);

// Mock chat store
vi.mock('@/src/store/chatStore');

const mockUseChatStore = vi.mocked(useChatStore);

describe('Chat Workflow Integration Tests', () => {
  const mockStore = {
    messages: [],
    isLoading: false,
    error: null,
    currentSession: null,
    pendingToolCall: null,
    streamingMessage: '',
    sendMessage: vi.fn(),
    confirmToolCall: vi.fn(),
    cancelToolCall: vi.fn(),
    clearError: vi.fn(),
    setCurrentSession: vi.fn(),
    addMessage: vi.fn(),
    updateMessage: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    setPendingToolCall: vi.fn(),
    setStreamingMessage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChatStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const renderChatInterface = () => {
    return render(
      <ClientProviders>
        <ChatInterface />
      </ClientProviders>
    );
  };

  describe('Basic Chat Flow', () => {
    it('should handle complete user message to AI response flow', async () => {
      const user = userEvent.setup();
      
      // Mock successful API response
      mockApiClient.sendMessage.mockResolvedValueOnce({
        reply: 'Hello! How can I help you today?',
        sessionId: 'test-session-1',
        usage: { promptTokens: 10, completionTokens: 15, totalTokens: 25 }
      });

      renderChatInterface();

      // Find message input
      const messageInput = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Type and send message
      await user.type(messageInput, 'Hello, how are you?');
      await user.click(sendButton);

      // Verify sendMessage was called
      expect(mockStore.sendMessage).toHaveBeenCalledWith('Hello, how are you?');

      // Wait for loading state
      await waitFor(() => {
        expect(mockStore.setLoading).toHaveBeenCalledWith(true);
      });
    });

    it('should handle streaming responses', async () => {
      const user = userEvent.setup();
      
      // Mock streaming response
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue('Hello');
          controller.enqueue(' there!');
          controller.close();
        }
      });

      mockApiClient.sendMessageStream.mockResolvedValueOnce(mockStream);

      renderChatInterface();

      const messageInput = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, 'Test streaming');
      await user.click(sendButton);

      // Verify streaming message updates
      await waitFor(() => {
        expect(mockStore.setStreamingMessage).toHaveBeenCalled();
      });
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock API error
      mockApiClient.sendMessage.mockRejectedValueOnce(new Error('Network error'));

      renderChatInterface();

      const messageInput = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, 'This will fail');
      await user.click(sendButton);

      // Verify error handling
      await waitFor(() => {
        expect(mockStore.setError).toHaveBeenCalledWith('Network error');
      });
    });
  });

  describe('Tool Execution Workflow', () => {
    it('should handle tool call proposal and confirmation', async () => {
      const user = userEvent.setup();
      
      const mockToolCall = {
        id: 'tool-call-1',
        type: 'function' as const,
        function: {
          name: 'weather.get_weather',
          arguments: JSON.stringify({ location: 'New York' })
        },
        serverId: 'weather',
        approved: false
      };

      // Mock tool call response
      mockApiClient.sendMessage.mockResolvedValueOnce({
        toolCalls: [mockToolCall],
        sessionId: 'test-session-1'
      });

      // Update store to show pending tool call
      mockStore.pendingToolCall = mockToolCall;
      mockUseChatStore.mockReturnValue({ ...mockStore, pendingToolCall: mockToolCall });

      renderChatInterface();

      const messageInput = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, 'What is the weather in New York?');
      await user.click(sendButton);

      // Verify tool confirmation dialog appears
      await waitFor(() => {
        expect(screen.getByText(/tool execution confirmation/i)).toBeInTheDocument();
      });

      // Verify tool details are shown
      expect(screen.getByText('weather.get_weather')).toBeInTheDocument();
      expect(screen.getByText(/location.*New York/i)).toBeInTheDocument();

      // Click run button
      const runButton = screen.getByRole('button', { name: /run/i });
      await user.click(runButton);

      // Verify confirmToolCall was called
      expect(mockStore.confirmToolCall).toHaveBeenCalledWith(mockToolCall);
    });

    it('should handle tool call cancellation', async () => {
      const user = userEvent.setup();
      
      const mockToolCall = {
        id: 'tool-call-1',
        type: 'function' as const,
        function: {
          name: 'file.delete_file',
          arguments: JSON.stringify({ path: '/important/file.txt' })
        },
        serverId: 'file',
        approved: false
      };

      mockStore.pendingToolCall = mockToolCall;
      mockUseChatStore.mockReturnValue({ ...mockStore, pendingToolCall: mockToolCall });

      renderChatInterface();

      // Tool confirmation dialog should be visible
      await waitFor(() => {
        expect(screen.getByText(/tool execution confirmation/i)).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Verify cancelToolCall was called
      expect(mockStore.cancelToolCall).toHaveBeenCalled();
    });

    it('should handle tool execution results', async () => {
      const user = userEvent.setup();
      
      const mockToolCall = {
        id: 'tool-call-1',
        type: 'function' as const,
        function: {
          name: 'weather.get_weather',
          arguments: JSON.stringify({ location: 'New York' })
        },
        serverId: 'weather',
        approved: true
      };

      // Mock successful tool execution
      mockApiClient.runTool.mockResolvedValueOnce({
        result: 'Weather in New York: 72°F, sunny',
        reply: 'The weather in New York is currently 72°F and sunny.',
        executionTime: 1500
      });

      mockStore.pendingToolCall = mockToolCall;
      mockUseChatStore.mockReturnValue({ ...mockStore, pendingToolCall: mockToolCall });

      renderChatInterface();

      // Confirm tool execution
      const runButton = screen.getByRole('button', { name: /run/i });
      await user.click(runButton);

      // Verify tool execution API call
      await waitFor(() => {
        expect(mockApiClient.runTool).toHaveBeenCalledWith({
          toolCall: mockToolCall,
          sessionId: mockStore.currentSession?.id,
          messages: mockStore.messages,
          approved: true
        });
      });
    });
  });

  describe('Session Management Integration', () => {
    it('should handle session creation and switching', async () => {
      const user = userEvent.setup();
      
      const mockSession = {
        id: 'session-1',
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'openai',
        model: 'gpt-4',
        mcpServers: ['weather'],
        tags: [],
        archived: false,
        totalTokens: 0,
        estimatedCost: 0
      };

      mockStore.currentSession = mockSession;
      mockUseChatStore.mockReturnValue({ ...mockStore, currentSession: mockSession });

      renderChatInterface();

      // Verify session is loaded
      expect(mockStore.setCurrentSession).toHaveBeenCalledWith(mockSession);
    });

    it('should handle message history loading', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: 'msg-2',
          role: 'assistant' as const,
          content: 'Hi there!',
          timestamp: new Date(),
        }
      ];

      mockStore.messages = mockMessages;
      mockUseChatStore.mockReturnValue({ ...mockStore, messages: mockMessages });

      renderChatInterface();

      // Verify messages are displayed
      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Hi there!')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery', () => {
    it('should recover from network errors', async () => {
      const user = userEvent.setup();
      
      // First call fails, second succeeds
      mockApiClient.sendMessage
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          reply: 'Success after retry',
          sessionId: 'test-session-1'
        });

      mockStore.error = 'Network error';
      mockUseChatStore.mockReturnValue({ ...mockStore, error: 'Network error' });

      renderChatInterface();

      // Error should be displayed
      expect(screen.getByText(/network error/i)).toBeInTheDocument();

      // Clear error and retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockStore.clearError).toHaveBeenCalled();
    });

    it('should handle tool execution failures', async () => {
      const user = userEvent.setup();
      
      const mockToolCall = {
        id: 'tool-call-1',
        type: 'function' as const,
        function: {
          name: 'file.read_file',
          arguments: JSON.stringify({ path: '/nonexistent.txt' })
        },
        serverId: 'file',
        approved: true
      };

      // Mock tool execution failure
      mockApiClient.runTool.mockRejectedValueOnce(new Error('File not found'));

      mockStore.pendingToolCall = mockToolCall;
      mockUseChatStore.mockReturnValue({ ...mockStore, pendingToolCall: mockToolCall });

      renderChatInterface();

      const runButton = screen.getByRole('button', { name: /run/i });
      await user.click(runButton);

      // Verify error handling
      await waitFor(() => {
        expect(mockStore.setError).toHaveBeenCalledWith('File not found');
      });
    });
  });
});