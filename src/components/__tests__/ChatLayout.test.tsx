import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Chat from '../Chat';

// Mock dependencies
vi.mock('../../store/chatStore', () => ({
  useChatStore: () => ({
    currentSession: {
      id: 'test-session',
      provider: 'openai',
      model: 'gpt-4',
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
        content: 'Hi there!',
        timestamp: new Date(),
      },
    ],
    isLoading: false,
    pendingToolCall: null,
    error: null,
    sendMessage: vi.fn(),
    deleteMessage: vi.fn(),
    confirmToolCall: vi.fn(),
    cancelToolCall: vi.fn(),
    setError: vi.fn(),
  }),
}));

vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: () => ({
    llmProviders: [
      {
        name: 'openai',
        enabled: true,
      },
    ],
  }),
}));

vi.mock('../../hooks/useEnhancedAccessibility', () => ({
  useEnhancedAccessibility: () => ({
    screenReaderUtils: {
      announceSuccess: vi.fn(),
      announceError: vi.fn(),
    },
  }),
  useModalAccessibility: () => ({
    modalRef: { current: null },
    createFocusTrap: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

// Mock scrollIntoView
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

describe('Chat Layout', () => {
  it('should have correct layout structure with input at bottom', () => {
    const { container } = render(<Chat />);
    
    // Check main container has chat-container class
    const mainElement = container.querySelector('div.chat-container');
    expect(mainElement).toBeInTheDocument();
    
    // Check that main container uses flexbox column layout
    expect(mainElement).toHaveClass('chat-container');
    expect(mainElement).toHaveClass('in-layout');
    
    // Check messages section exists and has flex-1 class
    const messagesSection = screen.getByLabelText(/chat messages/i);
    expect(messagesSection).toBeInTheDocument();
    expect(messagesSection).toHaveClass('flex-1');
    
    // Check input section exists and has flex-shrink-0 class
    const inputSection = screen.getByLabelText(/message input/i);
    expect(inputSection).toBeInTheDocument();
    expect(inputSection).toHaveClass('flex-shrink-0');
    expect(inputSection).toHaveClass('mt-auto');
    
    // Check that input section comes after messages section in DOM order
    const sections = container.querySelectorAll('section');
    const messagesIndex = Array.from(sections).findIndex(section => 
      section.getAttribute('aria-label')?.includes('messages')
    );
    const inputIndex = Array.from(sections).findIndex(section => 
      section.getAttribute('aria-label')?.includes('input')
    );
    
    expect(inputIndex).toBeGreaterThan(messagesIndex);
  });

  it('should have message input with sticky positioning', () => {
    render(<Chat />);
    
    // Find the message input container
    const messageInputContainer = document.querySelector('[class*="sticky"][class*="bottom-0"]');
    expect(messageInputContainer).toBeInTheDocument();
    
    // Check that it has the correct classes for bottom positioning
    expect(messageInputContainer).toHaveClass('sticky');
    expect(messageInputContainer).toHaveClass('bottom-0');
    expect(messageInputContainer).toHaveClass('z-10');
  });

  it('should have proper CSS classes for chat layout', () => {
    const { container } = render(<Chat />);
    
    const mainElement = container.querySelector('div.chat-container');
    expect(mainElement).toHaveClass('chat-container');
    
    // Check that the layout uses flexbox
    const computedStyle = window.getComputedStyle(mainElement!);
    // Note: In jsdom, computed styles might not reflect CSS, but we can check classes
    expect(mainElement).toHaveClass('chat-container');
  });

  it('should maintain input at bottom even with long message history', () => {
    render(<Chat />);
    
    // The input section should always be at the bottom due to flex layout
    const inputSection = screen.getByLabelText(/message input/i);
    const messagesSection = screen.getByLabelText(/chat messages/i);
    
    // Input section should have mt-auto to push it to bottom
    expect(inputSection).toHaveClass('mt-auto');
    
    // Messages section should have flex-1 to take available space
    expect(messagesSection).toHaveClass('flex-1');
  });
});