import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatSessions } from '../useChatSessions';
import { useChatStore } from '../../store/chatStore';

// Mock the chat store
vi.mock('../../store/chatStore', () => ({
  useChatStore: vi.fn(),
}));

describe('useChatSessions', () => {
  const mockLoadSessions = vi.fn();
  const mockCreateNewSession = vi.fn();
  const mockLoadSession = vi.fn();
  const mockDeleteSession = vi.fn();
  const mockUpdateSessionTitle = vi.fn();
  const mockSearchSessions = vi.fn();

  const mockSessions = [
    {
      id: 'session-1',
      title: 'Test Session 1',
      messages: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      provider: 'openai',
      model: 'gpt-4',
    },
    {
      id: 'session-2',
      title: 'Test Session 2',
      messages: [],
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      provider: 'deepseek',
      model: 'deepseek-chat',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useChatStore as any).mockReturnValue({
      sessions: mockSessions,
      currentSession: mockSessions[0],
      isLoadingSessions: false,
      error: null,
      loadSessions: mockLoadSessions,
      createNewSession: mockCreateNewSession,
      loadSession: mockLoadSession,
      deleteSession: mockDeleteSession,
      updateSessionTitle: mockUpdateSessionTitle,
      searchSessions: mockSearchSessions,
    });
  });

  it('should return sessions and loading state', () => {
    const { result } = renderHook(() => useChatSessions());

    expect(result.current.sessions).toEqual(mockSessions);
    expect(result.current.currentSession).toEqual(mockSessions[0]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should load sessions on mount', () => {
    renderHook(() => useChatSessions());

    expect(mockLoadSessions).toHaveBeenCalledTimes(1);
  });

  it('should create new session', async () => {
    const { result } = renderHook(() => useChatSessions());

    await act(async () => {
      await result.current.createSession('openai', 'gpt-4', ['server-1']);
    });

    expect(mockCreateNewSession).toHaveBeenCalledWith('openai', 'gpt-4', ['server-1']);
  });

  it('should load session', async () => {
    const { result } = renderHook(() => useChatSessions());

    await act(async () => {
      await result.current.loadSession('session-1');
    });

    expect(mockLoadSession).toHaveBeenCalledWith('session-1');
  });

  it('should delete session', async () => {
    const { result } = renderHook(() => useChatSessions());

    await act(async () => {
      await result.current.deleteSession('session-1');
    });

    expect(mockDeleteSession).toHaveBeenCalledWith('session-1');
  });

  it('should update session title', async () => {
    const { result } = renderHook(() => useChatSessions());

    await act(async () => {
      await result.current.updateSessionTitle('session-1', 'New Title');
    });

    expect(mockUpdateSessionTitle).toHaveBeenCalledWith('session-1', 'New Title');
  });

  it('should search sessions', () => {
    mockSearchSessions.mockReturnValue([mockSessions[0]]);
    
    const { result } = renderHook(() => useChatSessions());

    act(() => {
      result.current.searchSessions('Test Session 1');
    });

    expect(mockSearchSessions).toHaveBeenCalledWith('Test Session 1');
  });

  it('should handle loading state', () => {
    (useChatStore as any).mockReturnValue({
      sessions: [],
      currentSession: null,
      isLoadingSessions: true,
      error: null,
      loadSessions: mockLoadSessions,
      createNewSession: mockCreateNewSession,
      loadSession: mockLoadSession,
      deleteSession: mockDeleteSession,
      updateSessionTitle: mockUpdateSessionTitle,
      searchSessions: mockSearchSessions,
    });

    const { result } = renderHook(() => useChatSessions());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.sessions).toEqual([]);
  });

  it('should handle error state', () => {
    const errorMessage = 'Failed to load sessions';
    
    (useChatStore as any).mockReturnValue({
      sessions: [],
      currentSession: null,
      isLoadingSessions: false,
      error: errorMessage,
      loadSessions: mockLoadSessions,
      createNewSession: mockCreateNewSession,
      loadSession: mockLoadSession,
      deleteSession: mockDeleteSession,
      updateSessionTitle: mockUpdateSessionTitle,
      searchSessions: mockSearchSessions,
    });

    const { result } = renderHook(() => useChatSessions());

    expect(result.current.error).toBe(errorMessage);
  });

  it('should refresh sessions', async () => {
    const { result } = renderHook(() => useChatSessions());

    await act(async () => {
      await result.current.refreshSessions();
    });

    expect(mockLoadSessions).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
  });

  it('should get session by id', () => {
    const { result } = renderHook(() => useChatSessions());

    const session = result.current.getSessionById('session-1');
    expect(session).toEqual(mockSessions[0]);

    const nonExistentSession = result.current.getSessionById('non-existent');
    expect(nonExistentSession).toBeUndefined();
  });

  it('should get recent sessions', () => {
    const { result } = renderHook(() => useChatSessions());

    const recentSessions = result.current.getRecentSessions(1);
    expect(recentSessions).toHaveLength(1);
    expect(recentSessions[0]).toEqual(mockSessions[1]); // Most recent first
  });

  it('should group sessions by date', () => {
    const { result } = renderHook(() => useChatSessions());

    const groupedSessions = result.current.getSessionsByDate();
    
    expect(groupedSessions).toHaveProperty('2024-01-02');
    expect(groupedSessions).toHaveProperty('2024-01-01');
    expect(groupedSessions['2024-01-02']).toHaveLength(1);
    expect(groupedSessions['2024-01-01']).toHaveLength(1);
  });

  it('should get sessions by provider', () => {
    const { result } = renderHook(() => useChatSessions());

    const openaiSessions = result.current.getSessionsByProvider('openai');
    expect(openaiSessions).toHaveLength(1);
    expect(openaiSessions[0].provider).toBe('openai');

    const deepseekSessions = result.current.getSessionsByProvider('deepseek');
    expect(deepseekSessions).toHaveLength(1);
    expect(deepseekSessions[0].provider).toBe('deepseek');
  });
});