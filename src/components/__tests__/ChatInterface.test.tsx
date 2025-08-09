import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ChatInterface from '../ChatInterface';
import { useChatStore } from '../../store/chatStore';
import { useSettingsStore } from '../../store/settingsStore';

// Mock the stores
vi.mock('../../store/chatStore');
vi.mock('../../store/settingsStore');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));
vi.mock('../../hooks/useEnhancedAccessibility', () => ({
  useEnhancedAccessibility: () => ({
    screenReaderUtils: {
      announceError: vi.fn(),
      announceSuccess: vi.fn(),
    },
  }),
  useModalAccessibility: () => ({
    modalRef: { current: null },
    createFocusTrap: vi.fn(),
  }),
}));

const mockUseChatStore = useChatStore as any;
const mockUseSettingsStore = useSettingsStore as any;

describe('ChatInterface', () => {
  const mockSendMessage = vi.fn();
  const mockConfirmToolCall = vi.fn();
  const mockCancelToolCall = vi.fn();
  const mockDeleteMessage = vi.fn();
  const mockSetError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock DOM methods
    Element.prototype.scrollIntoView = vi.fn();
    HTMLElement.prototype.focus = vi.fn();
    
    // Default chat store state
    mockUseChatStore.mockReturnValue({
      currentSession: {
        id: 'test-session',
        provider: 'openai',
        model: 'gpt-4',
        title: 'Test Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hi there! How can I help you?',
          timestamp: new Date(),
        },
      ],
      isLoading: false,
      pendingToolCall: null,
      error: null,
      sendMessage: mockSendMessage,
      deleteMessage: mockDeleteMessage,
      confirmToolCall: mockConfirmToolCall,
      cancelToolCall: mockCancelToolCall,
      setError: mockSetError,
    });

    // Default settings store state
    mockUseSettingsStore.mockReturnValue({
      llmProviders: [
        {
          id: 'openai-1',
          name: 'openai',
          enabled: true,
          apiKey: 'test-key',
          models: [],
        },
      ],
    });
  });

  it('renders chat interface with messages', () => {
    render(<ChatInterface />);
    
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there! How can I help you?')).toBeInTheDocument();
  });

  it('shows no session message when no current session', () => {
    mockUseChatStore.mockReturnValue({
      ...mockUseChatStore(),
      currentSession: null,
      messages: [],
    });

    render(<ChatInterface />);
    
    expect(screen.getByText('No Chat Session')).toBeInTheDocument();
    expect(screen.getByText('Create a new chat to start a conversation with an AI assistant.')).toBeInTheDocument();
  });

  it('shows configuration warning when no valid provider', () => {
    mockUseSettingsStore.mockReturnValue({
      llmProviders: [
        {
          id: 'openai-1',
          name: 'openai',
          enabled: false, // Disabled provider
          apiKey: 'test-key',
          models: [],
        },
      ],
    });

    render(<ChatInterface />);
    
    expect(screen.getByText('Configuration Required')).toBeInTheDocument();
    expect(screen.getByText('Please configure a valid LLM provider in settings to start chatting.')).toBeInTheDocument();
  });

  it('shows error alert when there is an error', () => {
    mockUseChatStore.mockReturnValue({
      ...mockUseChatStore(),
      error: 'Test error message',
    });

    render(<ChatInterface />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('handles message sending', async () => {
    render(<ChatInterface />);
    
    const messageInput = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    });
  });

  it('shows tool confirmation dialog when pending tool call', () => {
    const mockToolCall = {
      id: 'tool-1',
      type: 'function' as const,
      function: {
        name: 'test_tool',
        arguments: '{"param": "value"}',
      },
      serverId: 'test-server',
    };

    mockUseChatStore.mockReturnValue({
      ...mockUseChatStore(),
      pendingToolCall: mockToolCall,
    });

    render(<ChatInterface />);
    
    // Tool confirmation dialog should be rendered
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('handles tool confirmation', async () => {
    const mockToolCall = {
      id: 'tool-1',
      type: 'function' as const,
      function: {
        name: 'test_tool',
        arguments: '{"param": "value"}',
      },
      serverId: 'test-server',
    };

    mockUseChatStore.mockReturnValue({
      ...mockUseChatStore(),
      pendingToolCall: mockToolCall,
    });

    render(<ChatInterface />);
    
    const confirmButton = screen.getByRole('button', { name: /run/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockConfirmToolCall).toHaveBeenCalledWith(mockToolCall);
    });
  });

  it('handles tool cancellation', async () => {
    const mockToolCall = {
      id: 'tool-1',
      type: 'function' as const,
      function: {
        name: 'test_tool',
        arguments: '{"param": "value"}',
      },
      serverId: 'test-server',
    };

    mockUseChatStore.mockReturnValue({
      ...mockUseChatStore(),
      pendingToolCall: mockToolCall,
    });

    render(<ChatInterface />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(mockCancelToolCall).toHaveBeenCalled();
    });
  });

  it('provides keyboard accessibility', () => {
    render(<ChatInterface />);
    
    // Check for skip link
    const skipLink = screen.getByText('Skip to message input');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink.closest('a')).toHaveAttribute('href', '#message-input');
  });

  it('has proper ARIA labels and roles', () => {
    render(<ChatInterface />);
    
    const mainElement = screen.getByRole('main');
    expect(mainElement).toHaveAttribute('aria-label', 'Chat interface');
    
    const messagesSection = screen.getByRole('log');
    expect(messagesSection).toHaveAttribute('aria-label', 'Chat messages');
    expect(messagesSection).toHaveAttribute('aria-live', 'polite');
  });

  it('handles loading states correctly', () => {
    mockUseChatStore.mockReturnValue({
      ...mockUseChatStore(),
      isLoading: true,
    });

    render(<ChatInterface />);
    
    // Message input should be disabled during loading
    const messageInput = screen.getByRole('textbox');
    expect(messageInput).toBeDisabled();
  });
});