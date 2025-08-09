import { useState, useCallback } from 'react';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  provider: string;
  model: string;
}

export const useChatSessions = () => {
  // Mock data - in real implementation, this would come from a store/API
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: 'Getting started with MCP',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      messageCount: 12,
      provider: 'openai',
      model: 'gpt-4',
    },
    {
      id: '2', 
      title: 'File processing automation',
      createdAt: new Date('2024-01-14'),
      updatedAt: new Date('2024-01-14'),
      messageCount: 8,
      provider: 'deepseek',
      model: 'deepseek-chat',
    },
    {
      id: '3',
      title: 'Data analysis workflow',
      createdAt: new Date('2024-01-13'),
      updatedAt: new Date('2024-01-13'),
      messageCount: 15,
      provider: 'openrouter',
      model: 'anthropic/claude-3-sonnet',
    },
  ]);

  const createSession = useCallback((provider: string, model: string) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      provider,
      model,
    };
    
    setChatSessions(sessions => [newSession, ...sessions]);
    return newSession.id;
  }, []);

  const updateSession = useCallback((sessionId: string, updates: Partial<ChatSession>) => {
    setChatSessions(sessions =>
      sessions.map(session =>
        session.id === sessionId
          ? { ...session, ...updates, updatedAt: new Date() }
          : session
      )
    );
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setChatSessions(sessions =>
      sessions.filter(session => session.id !== sessionId)
    );
  }, []);

  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    updateSession(sessionId, { title: newTitle });
  }, [updateSession]);

  const getSession = useCallback((sessionId: string) => {
    return chatSessions.find(session => session.id === sessionId);
  }, [chatSessions]);

  const searchSessions = useCallback((query: string) => {
    if (!query.trim()) return chatSessions;
    
    return chatSessions.filter(session =>
      session.title.toLowerCase().includes(query.toLowerCase())
    );
  }, [chatSessions]);

  return {
    chatSessions,
    createSession,
    updateSession,
    deleteSession,
    renameSession,
    getSession,
    searchSessions,
  };
};

export default useChatSessions;