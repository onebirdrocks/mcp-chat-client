import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getSettings, POST as postSettings, PUT as putSettings } from '../settings/route';
import { GET as getChatHistory, DELETE as deleteChatHistory, PUT as updateChatHistory } from '../chat-history/route';
import { GET as getSession, PUT as updateSession, DELETE as deleteSession } from '../chat-history/[sessionId]/route';

// Mock the session manager
vi.mock('@/services/SessionManager', () => ({
  getSessionManager: () => ({
    searchSessions: vi.fn().mockResolvedValue({
      sessions: [
        {
          id: 'session-1',
          title: 'Test Session',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          messageCount: 5,
          provider: 'openai',
          model: 'gpt-4',
        },
      ],
      total: 1,
      hasMore: false,
    }),
    getSession: vi.fn().mockResolvedValue({
      id: 'session-1',
      title: 'Test Session',
      messages: [],
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      provider: 'openai',
      model: 'gpt-4',
      mcpServers: [],
    }),
    updateSession: vi.fn().mockResolvedValue({
      id: 'session-1',
      title: 'Updated Session',
      messages: [],
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      provider: 'openai',
      model: 'gpt-4',
      mcpServers: [],
    }),
    deleteSession: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock the startup utility
vi.mock('@/lib/startup', () => ({
  ensureInitialized: vi.fn().mockResolvedValue(undefined),
}));

describe('API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('/api/settings', () => {
    it('should handle GET request', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'GET',
      });

      const response = await getSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('llmProviders');
      expect(data).toHaveProperty('mcpServers');
      expect(data).toHaveProperty('preferences');
    });

    it('should handle POST request', async () => {
      const settingsData = {
        preferences: {
          theme: 'dark',
          language: 'en',
          autoScroll: true,
          soundEnabled: false,
        },
      };

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: JSON.stringify(settingsData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await postSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences.theme).toBe('dark');
    });

    it('should handle PUT request', async () => {
      const settingsData = {
        preferences: {
          theme: 'light',
          language: 'zh',
          autoScroll: false,
          soundEnabled: true,
        },
      };

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await putSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences.theme).toBe('light');
      expect(data.preferences.language).toBe('zh');
    });
  });

  describe('/api/chat-history', () => {
    it('should handle GET request for chat history', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat-history', {
        method: 'GET',
      });

      const response = await getChatHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('sessions');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('hasMore');
      expect(Array.isArray(data.sessions)).toBe(true);
    });

    it('should handle GET request with query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat-history?limit=10&offset=0&query=test', {
        method: 'GET',
      });

      const response = await getChatHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessions).toBeDefined();
    });

    it('should handle DELETE request for session deletion', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat-history?sessionId=session-1', {
        method: 'DELETE',
      });

      const response = await deleteChatHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle PUT request for session update', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat-history?sessionId=session-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Session' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await updateChatHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Session');
    });
  });

  describe('/api/chat-history/[sessionId]', () => {
    it('should handle GET request for specific session', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat-history/session-1', {
        method: 'GET',
      });

      const response = await getSession(request, { params: { sessionId: 'session-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('session-1');
      expect(data.title).toBe('Test Session');
      expect(data).toHaveProperty('messages');
      expect(data).toHaveProperty('createdAt');
      expect(data).toHaveProperty('updatedAt');
    });

    it('should handle PUT request for session update', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat-history/session-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Session' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await updateSession(request, { params: { sessionId: 'session-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Session');
    });

    it('should handle DELETE request for session deletion', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat-history/session-1', {
        method: 'DELETE',
      });

      const response = await deleteSession(request, { params: { sessionId: 'session-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle validation errors in settings', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await postSettings(request);
      
      expect(response.status).toBe(400);
    });

    it('should handle missing sessionId in chat history operations', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat-history', {
        method: 'DELETE',
      });

      const response = await deleteChatHistory(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ValidationError');
    });

    it('should handle invalid limit parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat-history?limit=200', {
        method: 'GET',
      });

      const response = await getChatHistory(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ValidationError');
    });
  });
});