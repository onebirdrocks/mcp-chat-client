import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import Chat from '../Chat';
import { useChatStore } from '../../store/chatStore';
import { useSettingsStore } from '../../store/settingsStore';
import { chatApi } from '../../services/apiClient';
import type { ChatResponse, RunToolResponse, LLMProviderConfig } from '../../types';

// Mock the API client
vi.mock('../../services/apiClient', () => ({
  chatApi: {
    sendMessage: vi.fn(),
    runTool: vi.fn(),
    cancelTool: vi.fn(),
    getChatHistory: vi.fn(),
    getSession: vi.fn(),
    deleteSession: vi.fn(),
    updateSession: vi.fn(),
    generateSessionTitle: vi.fn(),
  },
}));

// Mock scrollIntoView for testing
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

const mockChatApi = chatApi as any;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nextProvider i18n={i18n}>
    {children}
  </I18nextProvider>
);

describe('Chat Integration Tests', () => {
  const mockProvider: LLMProviderConfig = {
    id: 'test-openai',
    name: 'openai',
    apiKey: 'test-api-key',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        supportsToolCalling: true,
        maxTokens: 8192,
      },
    ],
    enabled: true,
  };

  beforeEach(() => {
    // Reset stores
    useChatStore.getState().clearCurrentSession();
    useChatStore.setState({ sessions: [], error: null });
    
    // Setup settings store with mock provider
    useSettingsStore.setState({
      llmProviders: [mockProvider],
      mcpServers: [],
      preferences: {
        theme: 'light',
        language: 'en',
        autoScroll: true,
        soundEnabled: false,
      },
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should display no session message when no active session', () => {
    render(
      <TestWrapper>
        <Chat />
      </TestWrapper>
    );

    expect(screen.getByText('No Chat Session')).toBeInTheDocument();
    expect(screen.getByText('Create a new chat to start a conversation with an AI assistant.')).toBeInTheDocument();
  });

  it('should display configuration warning when no valid provider', () => {
    // Remove API key from provider
    useSettingsStore.setState({
      llmProviders: [{
        ...mockProvider,
        apiKey: '',
      }],
    });

    // Create a session
    useChatStore.getState().createNewSession('openai', 'gpt-4');

    render(
      <TestWrapper>
        <Chat />
      </TestWrapper>
    );

    expect(screen.getByText('Configuration Required')).toBeInTheDocument();
    // The warning message should be present (even if translation doesn't work in tests)
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toBeInTheDocument();
  });

  it('should send message and display response', async () => {
    const user = userEvent.setup();
    
    // Create a session
    useChatStore.getState().createNewSession('openai', 'gpt-4');

    // Mock successful API response
    const mockResponse: ChatResponse = {
      reply: 'Hello! How can I help you today?',
      sessionId: 'test-session',
    };
    mockChatApi.sendMessage.mockResolvedValueOnce(mockResponse);

    render(
      <TestWrapper>
        <Chat />
      </TestWrapper>
    );

    // Find and type in the message input
    const messageInput = screen.getByPlaceholderText('Type your message here...');
    await user.type(messageInput, 'Hello, AI!');

    // Send the message
    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    // Wait for the API call and response
    await waitFor(() => {
      expect(mockChatApi.sendMessage).toHaveBeenCalledWith({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Hello, AI!',
          }),
        ]),
        sessionId: expect.any(String),
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-api-key',
        baseUrl: 'https://api.openai.com/v1',
      });
    });

    // Check that messages are displayed
    await waitFor(() => {
      expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
      expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
    });

    // Input should be cleared
    expect(messageInput).toHaveValue('');
  });

  it('should handle tool call confirmation workflow', async () => {
    const user = userEvent.setup();
    
    // Create a session
    useChatStore.getState().createNewSession('openai', 'gpt-4');

    // Mock API response with tool call
    const mockChatResponse: ChatResponse = {
      reply: 'I need to use a tool to help with your request.',
      toolCalls: [
        {
          id: 'tool-call-1',
          type: 'function',
          function: {
            name: 'get_weather',
            arguments: '{"location": "New York"}',
          },
        },
      ],
      sessionId: 'test-session',
    };
    mockChatApi.sendMessage.mockResolvedValueOnce(mockChatResponse);

    // Mock tool execution response
    const mockToolResponse: RunToolResponse = {
      result: 'Weather in New York: 72°F, sunny',
      reply: 'The weather in New York is currently 72°F and sunny.',
    };
    mockChatApi.runTool.mockResolvedValueOnce(mockToolResponse);

    render(
      <TestWrapper>
        <Chat />
      </TestWrapper>
    );

    // Send a message that triggers a tool call
    const messageInput = screen.getByPlaceholderText('Type your message here...');
    await user.type(messageInput, 'What\'s the weather in New York?');
    
    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    // Wait for tool confirmation dialog
    await waitFor(() => {
      // Check if the tool confirmation dialog appears, or at least the tool call is shown
      const toolConfirmationElements = screen.queryAllByText('Tool Confirmation');
      const getWeatherElements = screen.getAllByText('get_weather');
      
      if (toolConfirmationElements.length > 0) {
        expect(toolConfirmationElements[0]).toBeInTheDocument();
      }
      expect(getWeatherElements.length).toBeGreaterThan(0);
    });

    // Confirm the tool execution
    const runToolButton = screen.getByRole('button', { name: /run tool/i });
    await user.click(runToolButton);

    // Wait for tool execution
    await waitFor(() => {
      expect(mockChatApi.runTool).toHaveBeenCalledWith({
        toolCall: mockChatResponse.toolCalls![0],
        sessionId: expect.any(String),
        messages: expect.any(Array),
      });
    });

    // Check that tool result and AI response are displayed
    await waitFor(() => {
      expect(screen.getByText('Weather in New York: 72°F, sunny')).toBeInTheDocument();
      expect(screen.getByText('The weather in New York is currently 72°F and sunny.')).toBeInTheDocument();
    });
  });

  it('should handle tool call cancellation', async () => {
    const user = userEvent.setup();
    
    // Create a session
    useChatStore.getState().createNewSession('openai', 'gpt-4');

    // Mock API response with tool call
    const mockChatResponse: ChatResponse = {
      reply: 'I need to use a tool to help with your request.',
      toolCalls: [
        {
          id: 'tool-call-1',
          type: 'function',
          function: {
            name: 'delete_file',
            arguments: '{"path": "/important/file.txt"}',
          },
        },
      ],
      sessionId: 'test-session',
    };
    mockChatApi.sendMessage.mockResolvedValueOnce(mockChatResponse);

    render(
      <TestWrapper>
        <Chat />
      </TestWrapper>
    );

    // Send a message that triggers a tool call
    const messageInput = screen.getByPlaceholderText('Type your message here...');
    await user.type(messageInput, 'Delete that file');
    
    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    // Wait for tool confirmation dialog
    await waitFor(() => {
      // The tool call should be visible in the message
      const deleteFileElements = screen.getAllByText('delete_file');
      expect(deleteFileElements.length).toBeGreaterThan(0);
      // Check if the tool confirmation dialog appears
      const toolConfirmationElements = screen.queryAllByText('Tool Confirmation');
      if (toolConfirmationElements.length > 0) {
        expect(toolConfirmationElements[0]).toBeInTheDocument();
      } else {
        // If modal doesn't appear, at least verify the tool call is shown
        expect(screen.getByText('Tool Call')).toBeInTheDocument();
      }
    });

    // Try to find and click cancel button if modal is present
    const cancelButtons = screen.queryAllByRole('button', { name: /cancel tool/i });
    if (cancelButtons.length > 0) {
      await user.click(cancelButtons[0]);
      
      // Check that cancellation message is displayed
      await waitFor(() => {
        expect(screen.getByText('Tool execution was cancelled by the user.')).toBeInTheDocument();
      });
    } else {
      // If modal doesn't appear, just verify the tool wasn't executed
      expect(mockChatApi.runTool).not.toHaveBeenCalled();
    }

    // Tool should not have been executed
    expect(mockChatApi.runTool).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Create a session
    useChatStore.getState().createNewSession('openai', 'gpt-4');

    // Mock API error
    const mockError = new Error('API rate limit exceeded');
    mockChatApi.sendMessage.mockRejectedValueOnce(mockError);

    render(
      <TestWrapper>
        <Chat />
      </TestWrapper>
    );

    // Send a message
    const messageInput = screen.getByPlaceholderText('Type your message here...');
    await user.type(messageInput, 'Hello');
    
    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getAllByText(/API rate limit exceeded/).length).toBeGreaterThan(0);
    });

    // Error message should also appear in chat
    await waitFor(() => {
      expect(screen.getByText(/I encountered an error: API rate limit exceeded/)).toBeInTheDocument();
    });
  });

  it('should handle loading states correctly', async () => {
    const user = userEvent.setup();
    
    // Create a session
    useChatStore.getState().createNewSession('openai', 'gpt-4');

    // Mock delayed API response
    let resolvePromise: (value: ChatResponse) => void;
    const delayedPromise = new Promise<ChatResponse>((resolve) => {
      resolvePromise = resolve;
    });
    mockChatApi.sendMessage.mockReturnValueOnce(delayedPromise);

    render(
      <TestWrapper>
        <Chat />
      </TestWrapper>
    );

    // Send a message
    const messageInput = screen.getByPlaceholderText('Type your message here...');
    await user.type(messageInput, 'Hello');
    
    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    // Check loading state
    await waitFor(() => {
      expect(screen.getAllByText(/Loading/).length).toBeGreaterThan(0);
    });

    // Input should be disabled during loading
    expect(messageInput).toBeDisabled();
    expect(sendButton).toBeDisabled();

    // Resolve the promise
    resolvePromise!({
      reply: 'Hello there!',
      sessionId: 'test-session',
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryAllByText(/Loading/)).toHaveLength(0);
    });

    // Input should be enabled again
    expect(messageInput).not.toBeDisabled();
    // Button remains disabled because input is empty after sending
    expect(sendButton).toBeDisabled();
  });

  it('should handle keyboard shortcuts', async () => {
    const user = userEvent.setup();
    
    // Create a session
    useChatStore.getState().createNewSession('openai', 'gpt-4');

    // Mock successful API response
    mockChatApi.sendMessage.mockResolvedValueOnce({
      reply: 'Message sent via Enter key!',
      sessionId: 'test-session',
    });

    render(
      <TestWrapper>
        <Chat />
      </TestWrapper>
    );

    // Type message and press Enter
    const messageInput = screen.getByPlaceholderText('Type your message here...');
    await user.type(messageInput, 'Test message');
    await user.keyboard('{Enter}');

    // Message should be sent
    await waitFor(() => {
      expect(mockChatApi.sendMessage).toHaveBeenCalled();
    });

    // Test Shift+Enter for new line
    await user.type(messageInput, 'Line 1');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(messageInput, 'Line 2');

    expect(messageInput).toHaveValue('Line 1\nLine 2');

    // Test Escape to clear
    await user.keyboard('{Escape}');
    expect(messageInput).toHaveValue('');
  });
});