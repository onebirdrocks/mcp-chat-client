import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatStore } from '../chatStore';

describe('ChatStore Edge Cases', () => {
  beforeEach(() => {
    // Reset the store before each test
    useChatStore.getState().clearCurrentSession();
    useChatStore.setState({ sessions: [] });
    vi.clearAllMocks();
  });

  it('should handle searchSessions when sessions is not an array', () => {
    const store = useChatStore.getState();
    
    // Simulate corrupted state where sessions is not an array
    useChatStore.setState({ sessions: null as any });
    
    const result = store.searchSessions('test');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  it('should handle searchSessions when sessions is undefined', () => {
    const store = useChatStore.getState();
    
    // Simulate corrupted state where sessions is undefined
    useChatStore.setState({ sessions: undefined as any });
    
    const result = store.searchSessions('test');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  it('should handle searchSessions with empty query', () => {
    const store = useChatStore.getState();
    
    // Set up some test sessions
    const testSessions = [
      {
        id: '1',
        title: 'Test Session 1',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'openai' as const,
        model: 'gpt-4',
        mcpServers: [],
      },
      {
        id: '2',
        title: 'Test Session 2',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'openai' as const,
        model: 'gpt-4',
        mcpServers: [],
      },
    ];
    
    useChatStore.setState({ sessions: testSessions });
    
    // Empty query should return all sessions
    const result = store.searchSessions('');
    expect(result).toEqual(testSessions);
    
    // Whitespace-only query should return all sessions
    const result2 = store.searchSessions('   ');
    expect(result2).toEqual(testSessions);
  });

  it('should handle searchSessions with valid sessions array', () => {
    const store = useChatStore.getState();
    
    // Set up some test sessions
    const testSessions = [
      {
        id: '1',
        title: 'JavaScript Tutorial',
        messages: [
          {
            id: 'm1',
            role: 'user' as const,
            content: 'Tell me about React',
            timestamp: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'openai' as const,
        model: 'gpt-4',
        mcpServers: [],
      },
      {
        id: '2',
        title: 'Python Guide',
        messages: [
          {
            id: 'm2',
            role: 'user' as const,
            content: 'How to use Django',
            timestamp: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'openai' as const,
        model: 'gpt-4',
        mcpServers: [],
      },
    ];
    
    useChatStore.setState({ sessions: testSessions });
    
    // Search by title
    const result1 = store.searchSessions('JavaScript');
    expect(result1).toHaveLength(1);
    expect(result1[0].title).toBe('JavaScript Tutorial');
    
    // Search by message content
    const result2 = store.searchSessions('React');
    expect(result2).toHaveLength(1);
    expect(result2[0].title).toBe('JavaScript Tutorial');
    
    // Search with no matches
    const result3 = store.searchSessions('nonexistent');
    expect(result3).toHaveLength(0);
  });
});