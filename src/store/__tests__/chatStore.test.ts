import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatStore } from '../chatStore';
import type { LLMProvider } from '../../types';

describe('ChatStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useChatStore.getState().clearCurrentSession();
    useChatStore.setState({ sessions: [] });
    vi.clearAllMocks();
  });

  it('should create a new session', () => {
    const store = useChatStore.getState();
    const provider: LLMProvider = 'openai';
    const model = 'gpt-4';
    
    store.createNewSession(provider, model);
    
    const { currentSession, sessions } = useChatStore.getState();
    
    expect(currentSession).toBeTruthy();
    expect(currentSession?.provider).toBe(provider);
    expect(currentSession?.model).toBe(model);
    expect(currentSession?.title).toBe('New Chat');
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toBe(currentSession);
  });

  it('should add messages to current session', () => {
    const store = useChatStore.getState();
    store.createNewSession('openai', 'gpt-4');
    
    store.addMessage({
      role: 'user',
      content: 'Hello, world!',
    });
    
    const { messages, currentSession } = useChatStore.getState();
    
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Hello, world!');
    expect(messages[0].id).toBeTruthy();
    expect(messages[0].timestamp).toBeInstanceOf(Date);
    
    // Session should be updated with the message
    expect(currentSession?.messages).toHaveLength(1);
    expect(currentSession?.title).toBe('Hello, world!'); // Auto-generated from first message
  });

  it('should update session title automatically from first user message', () => {
    const store = useChatStore.getState();
    store.createNewSession('openai', 'gpt-4');
    
    const longMessage = 'This is a very long message that should be truncated when used as a title because it exceeds the maximum length';
    
    store.addMessage({
      role: 'user',
      content: longMessage,
    });
    
    const { currentSession } = useChatStore.getState();
    
    expect(currentSession?.title).toBe('This is a very long message that should be trun...');
  });

  it('should handle tool calls', () => {
    const store = useChatStore.getState();
    store.createNewSession('openai', 'gpt-4');
    
    const toolCall = {
      id: 'tool-1',
      type: 'function' as const,
      function: {
        name: 'test_tool',
        arguments: '{"param": "value"}',
      },
    };
    
    store.setPendingToolCall(toolCall);
    
    const { pendingToolCall } = useChatStore.getState();
    expect(pendingToolCall).toBe(toolCall);
    
    // Cancel tool call
    store.cancelToolCall();
    
    const { pendingToolCall: afterCancel, messages } = useChatStore.getState();
    expect(afterCancel).toBeNull();
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Tool execution was cancelled by the user.');
  });

  it('should search sessions', () => {
    const store = useChatStore.getState();
    
    // Create multiple sessions with different content
    store.createNewSession('openai', 'gpt-4');
    store.addMessage({ role: 'user', content: 'Hello world' });
    
    store.createNewSession('deepseek', 'deepseek-chat');
    store.addMessage({ role: 'user', content: 'How to code in Python?' });
    
    store.createNewSession('openrouter', 'claude-3');
    store.addMessage({ role: 'user', content: 'Explain machine learning' });
    
    const { sessions } = useChatStore.getState();
    expect(sessions).toHaveLength(3);
    
    // Search by content
    const pythonResults = store.searchSessions('Python');
    expect(pythonResults).toHaveLength(1);
    expect(pythonResults[0].messages[0].content).toContain('Python');
    
    // Search by title
    const helloResults = store.searchSessions('Hello');
    expect(helloResults).toHaveLength(1);
    expect(helloResults[0].title).toContain('Hello');
    
    // Empty search should return all
    const allResults = store.searchSessions('');
    expect(allResults).toHaveLength(3);
  });

  it('should delete sessions', () => {
    const store = useChatStore.getState();
    
    store.createNewSession('openai', 'gpt-4');
    const sessionId = useChatStore.getState().currentSession!.id;
    
    store.createNewSession('deepseek', 'deepseek-chat');
    
    expect(useChatStore.getState().sessions).toHaveLength(2);
    
    // Delete the first session
    store.deleteSession(sessionId);
    
    const { sessions, currentSession } = useChatStore.getState();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].provider).toBe('deepseek');
    
    // Current session should still be the deepseek one
    expect(currentSession?.provider).toBe('deepseek');
  });

  it('should load existing session', async () => {
    const store = useChatStore.getState();
    
    // Create a session with messages
    store.createNewSession('openai', 'gpt-4');
    store.addMessage({ role: 'user', content: 'Test message' });
    const sessionId = useChatStore.getState().currentSession!.id;
    
    // Create another session
    store.createNewSession('deepseek', 'deepseek-chat');
    
    // Load the first session
    await store.loadSession(sessionId);
    
    const { currentSession, messages } = useChatStore.getState();
    expect(currentSession?.id).toBe(sessionId);
    expect(currentSession?.provider).toBe('openai');
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Test message');
  });

  it('should generate session titles correctly', () => {
    const store = useChatStore.getState();
    
    const messages = [
      {
        id: '1',
        role: 'user' as const,
        content: 'Short message',
        timestamp: new Date(),
      },
    ];
    
    expect(store.generateSessionTitle(messages)).toBe('Short message');
    
    const longMessages = [
      {
        id: '1',
        role: 'user' as const,
        content: 'This is a very long message that should be truncated',
        timestamp: new Date(),
      },
    ];
    
    expect(store.generateSessionTitle(longMessages)).toBe('This is a very long message that should be trun...');
    
    const noUserMessages = [
      {
        id: '1',
        role: 'assistant' as const,
        content: 'Assistant message',
        timestamp: new Date(),
      },
    ];
    
    expect(store.generateSessionTitle(noUserMessages)).toBe('New Chat');
  });
});