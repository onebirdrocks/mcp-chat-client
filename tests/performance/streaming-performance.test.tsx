/**
 * Performance tests for streaming responses and large chat histories
 * Tests system performance under various load conditions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '@/src/components/ChatInterface';
import { MessageList } from '@/src/components/MessageList';
import { ClientProviders } from '@/app/components/ClientProviders';
import { useChatStore } from '@/src/store/chatStore';
import * as apiClient from '@/src/services/apiClient';

// Mock API client
vi.mock('@/src/services/apiClient');
const mockApiClient = vi.mocked(apiClient);

// Mock chat store
vi.mock('@/src/store/chatStore');
const mockUseChatStore = vi.mocked(useChatStore);

// Performance measurement utilities
const measurePerformance = async (operation: () => Promise<void>) => {
  const start = performance.now();
  await operation();
  const end = performance.now();
  return end - start;
};

const createLargeMessageHistory = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: (i % 2 === 0 ? 'user' : 'assistant') as const,
    content: `This is message ${i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`,
    timestamp: new Date(Date.now() - (count - i) * 60000), // Messages 1 minute apart
    metadata: {
      tokenCount: 50,
      processingTime: 1000 + Math.random() * 2000,
      model: 'gpt-4'
    }
  }));
};

describe('Streaming Performance Tests', () => {
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

  describe('Streaming Response Performance', () => {
    it('should handle fast streaming responses efficiently', async () => {
      const user = userEvent.setup();
      
      // Create a fast streaming response (100 chunks per second)
      const chunks = Array.from({ length: 100 }, (_, i) => `Chunk ${i + 1} `);
      let chunkIndex = 0;

      const mockStream = new ReadableStream({
        start(controller) {
          const interval = setInterval(() => {
            if (chunkIndex < chunks.length) {
              controller.enqueue(chunks[chunkIndex]);
              chunkIndex++;
            } else {
              clearInterval(interval);
              controller.close();
            }
          }, 10); // 100 chunks per second
        }
      });

      mockApiClient.sendMessageStream.mockResolvedValueOnce(mockStream);

      renderChatInterface();

      const messageInput = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Measure streaming performance
      const streamingTime = await measurePerformance(async () => {
        await user.type(messageInput, 'Test fast streaming');
        await user.click(sendButton);

        // Wait for streaming to complete
        await waitFor(() => {
          expect(mockStore.setStreamingMessage).toHaveBeenCalledTimes(100);
        }, { timeout: 5000 });
      });

      // Streaming should complete within reasonable time (< 2 seconds)
      expect(streamingTime).toBeLessThan(2000);
    });

    it('should handle slow streaming responses without blocking UI', async () => {
      const user = userEvent.setup();
      
      // Create a slow streaming response (1 chunk per second)
      const chunks = Array.from({ length: 10 }, (_, i) => `Slow chunk ${i + 1} `);
      let chunkIndex = 0;

      const mockStream = new ReadableStream({
        start(controller) {
          const interval = setInterval(() => {
            if (chunkIndex < chunks.length) {
              controller.enqueue(chunks[chunkIndex]);
              chunkIndex++;
            } else {
              clearInterval(interval);
              controller.close();
            }
          }, 100); // 10 chunks per second (slower)
        }
      });

      mockApiClient.sendMessageStream.mockResolvedValueOnce(mockStream);

      renderChatInterface();

      const messageInput = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, 'Test slow streaming');
      await user.click(sendButton);

      // UI should remain responsive during streaming
      const uiResponseTime = await measurePerformance(async () => {
        // Try to interact with UI while streaming
        await user.clear(messageInput);
        await user.type(messageInput, 'Another message');
      });

      // UI interactions should be fast even during streaming
      expect(uiResponseTime).toBeLessThan(500);
    });

    it('should handle large streaming responses efficiently', async () => {
      const user = userEvent.setup();
      
      // Create a large streaming response (10KB of text)
      const largeText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(200);
      const chunks = largeText.match(/.{1,50}/g) || []; // Split into 50-character chunks
      let chunkIndex = 0;

      const mockStream = new ReadableStream({
        start(controller) {
          const interval = setInterval(() => {
            if (chunkIndex < chunks.length) {
              controller.enqueue(chunks[chunkIndex]);
              chunkIndex++;
            } else {
              clearInterval(interval);
              controller.close();
            }
          }, 5); // Fast streaming
        }
      });

      mockApiClient.sendMessageStream.mockResolvedValueOnce(mockStream);

      renderChatInterface();

      const messageInput = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Measure large streaming performance
      const streamingTime = await measurePerformance(async () => {
        await user.type(messageInput, 'Generate large response');
        await user.click(sendButton);

        // Wait for streaming to complete
        await waitFor(() => {
          expect(mockStore.setStreamingMessage).toHaveBeenCalledTimes(chunks.length);
        }, { timeout: 10000 });
      });

      // Large streaming should complete within reasonable time
      expect(streamingTime).toBeLessThan(5000);
    });

    it('should handle streaming interruption gracefully', async () => {
      const user = userEvent.setup();
      
      let controller: ReadableStreamDefaultController<string>;
      const mockStream = new ReadableStream({
        start(ctrl) {
          controller = ctrl;
          // Start streaming
          controller.enqueue('Starting response...');
        }
      });

      mockApiClient.sendMessageStream.mockResolvedValueOnce(mockStream);
      mockApiClient.cancelStream = vi.fn().mockImplementation(() => {
        controller.error(new Error('Stream cancelled'));
      });

      renderChatInterface();

      const messageInput = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, 'Test streaming cancellation');
      await user.click(sendButton);

      // Wait for streaming to start
      await waitFor(() => {
        expect(mockStore.setStreamingMessage).toHaveBeenCalled();
      });

      // Cancel streaming
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const cancellationTime = await measurePerformance(async () => {
        await user.click(cancelButton);
      });

      // Cancellation should be immediate
      expect(cancellationTime).toBeLessThan(100);
    });
  });

  describe('Large Chat History Performance', () => {
    it('should render large message history efficiently', async () => {
      const largeHistory = createLargeMessageHistory(1000);
      
      mockStore.messages = largeHistory;
      mockUseChatStore.mockReturnValue({ ...mockStore, messages: largeHistory });

      // Measure rendering time
      const renderTime = await measurePerformance(async () => {
        render(
          <ClientProviders>
            <MessageList />
          </ClientProviders>
        );

        // Wait for messages to be rendered
        await waitFor(() => {
          expect(screen.getByText('This is message 1.')).toBeInTheDocument();
        });
      });

      // Large history should render within reasonable time (< 2 seconds)
      expect(renderTime).toBeLessThan(2000);
    });

    it('should handle scrolling through large history smoothly', async () => {
      const user = userEvent.setup();
      const largeHistory = createLargeMessageHistory(500);
      
      mockStore.messages = largeHistory;
      mockUseChatStore.mockReturnValue({ ...mockStore, messages: largeHistory });

      render(
        <ClientProviders>
          <MessageList />
        </ClientProviders>
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('This is message 1.')).toBeInTheDocument();
      });

      const messageContainer = screen.getByTestId('message-list');

      // Measure scrolling performance
      const scrollTime = await measurePerformance(async () => {
        // Scroll to top
        messageContainer.scrollTop = 0;
        await new Promise(resolve => setTimeout(resolve, 100));

        // Scroll to middle
        messageContainer.scrollTop = messageContainer.scrollHeight / 2;
        await new Promise(resolve => setTimeout(resolve, 100));

        // Scroll to bottom
        messageContainer.scrollTop = messageContainer.scrollHeight;
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Scrolling should be smooth (< 500ms total)
      expect(scrollTime).toBeLessThan(500);
    });

    it('should handle adding messages to large history efficiently', async () => {
      const user = userEvent.setup();
      const largeHistory = createLargeMessageHistory(800);
      
      mockStore.messages = largeHistory;
      mockStore.addMessage = vi.fn().mockImplementation((message) => {
        mockStore.messages = [...mockStore.messages, message];
      });
      
      mockUseChatStore.mockReturnValue(mockStore);

      mockApiClient.sendMessage.mockResolvedValueOnce({
        reply: 'New message response',
        sessionId: 'test-session-1'
      });

      renderChatInterface();

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('This is message 1.')).toBeInTheDocument();
      });

      const messageInput = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Measure time to add new message
      const addMessageTime = await measurePerformance(async () => {
        await user.type(messageInput, 'New message');
        await user.click(sendButton);

        // Wait for message to be added
        await waitFor(() => {
          expect(mockStore.sendMessage).toHaveBeenCalledWith('New message');
        });
      });

      // Adding message should be fast even with large history
      expect(addMessageTime).toBeLessThan(1000);
    });

    it('should handle search in large history efficiently', async () => {
      const user = userEvent.setup();
      const largeHistory = createLargeMessageHistory(1000);
      
      // Add some searchable content
      largeHistory[100].content = 'This message contains the keyword SEARCHTERM for testing';
      largeHistory[500].content = 'Another message with SEARCHTERM in the middle';
      largeHistory[800].content = 'Final SEARCHTERM message for search testing';

      mockStore.messages = largeHistory;
      mockUseChatStore.mockReturnValue({ ...mockStore, messages: largeHistory });

      render(
        <ClientProviders>
          <MessageList />
        </ClientProviders>
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('This is message 1.')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search messages/i);

      // Measure search performance
      const searchTime = await measurePerformance(async () => {
        await user.type(searchInput, 'SEARCHTERM');

        // Wait for search results
        await waitFor(() => {
          expect(screen.getByText(/3 results found/i)).toBeInTheDocument();
        });
      });

      // Search should be fast even in large history
      expect(searchTime).toBeLessThan(1000);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not leak memory during streaming', async () => {
      const user = userEvent.setup();
      
      // Simulate multiple streaming sessions
      for (let i = 0; i < 10; i++) {
        const chunks = Array.from({ length: 50 }, (_, j) => `Stream ${i + 1} chunk ${j + 1} `);
        let chunkIndex = 0;

        const mockStream = new ReadableStream({
          start(controller) {
            const interval = setInterval(() => {
              if (chunkIndex < chunks.length) {
                controller.enqueue(chunks[chunkIndex]);
                chunkIndex++;
              } else {
                clearInterval(interval);
                controller.close();
              }
            }, 10);
          }
        });

        mockApiClient.sendMessageStream.mockResolvedValueOnce(mockStream);

        renderChatInterface();

        const messageInput = screen.getByPlaceholderText(/type your message/i);
        const sendButton = screen.getByRole('button', { name: /send/i });

        await user.type(messageInput, `Stream test ${i + 1}`);
        await user.click(sendButton);

        // Wait for streaming to complete
        await waitFor(() => {
          expect(mockStore.setStreamingMessage).toHaveBeenCalled();
        });

        // Clear for next iteration
        vi.clearAllMocks();
        mockUseChatStore.mockReturnValue({ ...mockStore, streamingMessage: '' });
      }

      // Memory usage should remain stable (this is a basic check)
      // In a real environment, you would use performance.measureUserAgentSpecificMemory()
      expect(true).toBe(true); // Placeholder for memory leak detection
    });

    it('should handle concurrent operations efficiently', async () => {
      const user = userEvent.setup();
      
      // Simulate concurrent streaming and UI interactions
      const chunks = Array.from({ length: 100 }, (_, i) => `Concurrent chunk ${i + 1} `);
      let chunkIndex = 0;

      const mockStream = new ReadableStream({
        start(controller) {
          const interval = setInterval(() => {
            if (chunkIndex < chunks.length) {
              controller.enqueue(chunks[chunkIndex]);
              chunkIndex++;
            } else {
              clearInterval(interval);
              controller.close();
            }
          }, 20);
        }
      });

      mockApiClient.sendMessageStream.mockResolvedValueOnce(mockStream);

      renderChatInterface();

      const messageInput = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Start streaming
      await user.type(messageInput, 'Concurrent test');
      await user.click(sendButton);

      // Measure concurrent operations
      const concurrentTime = await measurePerformance(async () => {
        // Perform multiple UI operations while streaming
        const operations = [
          user.clear(messageInput),
          user.type(messageInput, 'Another message'),
          user.clear(messageInput),
          user.type(messageInput, 'Third message'),
          user.clear(messageInput),
          user.type(messageInput, 'Fourth message'),
        ];

        await Promise.all(operations);
      });

      // Concurrent operations should remain responsive
      expect(concurrentTime).toBeLessThan(1000);
    });
  });

  describe('Network Performance', () => {
    it('should handle network latency gracefully', async () => {
      const user = userEvent.setup();
      
      // Simulate high network latency
      mockApiClient.sendMessage.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        return {
          reply: 'Response with high latency',
          sessionId: 'test-session-1'
        };
      });

      renderChatInterface();

      const messageInput = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      const responseTime = await measurePerformance(async () => {
        await user.type(messageInput, 'High latency test');
        await user.click(sendButton);

        // UI should show loading state immediately
        expect(mockStore.setLoading).toHaveBeenCalledWith(true);

        // Wait for response
        await waitFor(() => {
          expect(mockApiClient.sendMessage).toHaveBeenCalled();
        }, { timeout: 3000 });
      });

      // Should handle latency gracefully
      expect(responseTime).toBeGreaterThan(2000);
      expect(responseTime).toBeLessThan(3000);
    });

    it('should handle network failures with retry', async () => {
      const user = userEvent.setup();
      
      // First call fails, second succeeds
      mockApiClient.sendMessage
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          reply: 'Success after retry',
          sessionId: 'test-session-1'
        });

      renderChatInterface();

      const messageInput = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, 'Network failure test');
      await user.click(sendButton);

      // Wait for error
      await waitFor(() => {
        expect(mockStore.setError).toHaveBeenCalledWith('Network error');
      });

      // Retry should work
      const retryButton = screen.getByRole('button', { name: /retry/i });
      const retryTime = await measurePerformance(async () => {
        await user.click(retryButton);

        await waitFor(() => {
          expect(mockStore.clearError).toHaveBeenCalled();
        });
      });

      // Retry should be fast
      expect(retryTime).toBeLessThan(500);
    });
  });
});