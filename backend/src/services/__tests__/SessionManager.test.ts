import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../SessionManager';
import { promises as fs } from 'fs';
import { LLMProvider, Message } from '@/types';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

const mockFs = fs as any;

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  const testStorageDir = './test-sessions';

  beforeEach(() => {
    vi.clearAllMocks();
    sessionManager = new SessionManager(testStorageDir, 10, 1000); // Small limits for testing
  });

  afterEach(async () => {
    await sessionManager.shutdown();
  });

  describe('initialization', () => {
    it('should create storage directory and initialize empty storage', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      mockFs.writeFile.mockResolvedValue(undefined);

      await sessionManager.initialize();

      expect(mockFs.mkdir).toHaveBeenCalledWith(testStorageDir, { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should load existing sessions from storage', async () => {
      const existingData = {
        sessions: {
          'test-session': {
            id: 'test-session',
            title: 'Test Session',
            messages: [],
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            provider: 'openai',
            model: 'gpt-4',
            mcpServers: [],
          },
        },
        metadata: {
          lastCleanup: '2024-01-01T00:00:00.000Z',
          totalSessions: 1,
        },
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingData));

      await sessionManager.initialize();

      const session = await sessionManager.getSession('test-session');
      expect(session.title).toBe('Test Session');
    });
  });

  describe('session management', () => {
    beforeEach(async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      mockFs.writeFile.mockResolvedValue(undefined);
      await sessionManager.initialize();
    });

    it('should create a new session', async () => {
      const session = await sessionManager.createSession('openai', 'gpt-4', ['server1']);

      expect(session.id).toBeDefined();
      expect(session.title).toBe('New Chat');
      expect(session.provider).toBe('openai');
      expect(session.model).toBe('gpt-4');
      expect(session.mcpServers).toEqual(['server1']);
      expect(session.messages).toEqual([]);
    });

    it('should get an existing session', async () => {
      const createdSession = await sessionManager.createSession('openai', 'gpt-4');
      const retrievedSession = await sessionManager.getSession(createdSession.id);

      expect(retrievedSession.id).toBe(createdSession.id);
      expect(retrievedSession.title).toBe(createdSession.title);
    });

    it('should throw error when getting non-existent session', async () => {
      await expect(sessionManager.getSession('non-existent')).rejects.toThrow('not found');
    });

    it('should update a session', async () => {
      const session = await sessionManager.createSession('openai', 'gpt-4');
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const updatedSession = await sessionManager.updateSession(session.id, {
        title: 'Updated Title',
      });

      expect(updatedSession.title).toBe('Updated Title');
      expect(updatedSession.updatedAt.getTime()).toBeGreaterThanOrEqual(session.updatedAt.getTime());
    });

    it('should delete a session', async () => {
      const session = await sessionManager.createSession('openai', 'gpt-4');
      await sessionManager.deleteSession(session.id);

      await expect(sessionManager.getSession(session.id)).rejects.toThrow('not found');
    });

    it('should add a message to a session', async () => {
      const session = await sessionManager.createSession('openai', 'gpt-4');
      const message: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      const updatedSession = await sessionManager.addMessage(session.id, message);

      expect(updatedSession.messages).toHaveLength(1);
      expect(updatedSession.messages[0].content).toBe('Hello');
    });
  });

  describe('session search', () => {
    beforeEach(async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      mockFs.writeFile.mockResolvedValue(undefined);
      await sessionManager.initialize();

      // Create test sessions
      await sessionManager.createSession('openai', 'gpt-4');
      await sessionManager.createSession('deepseek', 'deepseek-chat');
      const session3 = await sessionManager.createSession('openai', 'gpt-3.5-turbo');
      await sessionManager.updateSession(session3.id, { title: 'Special Chat' });
    });

    it('should search sessions by query', async () => {
      const result = await sessionManager.searchSessions({ query: 'Special' });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].title).toBe('Special Chat');
    });

    it('should filter sessions by provider', async () => {
      const result = await sessionManager.searchSessions({ provider: 'openai' });

      expect(result.sessions).toHaveLength(2);
      expect(result.sessions.every(s => s.provider === 'openai')).toBe(true);
    });

    it('should apply pagination', async () => {
      const result = await sessionManager.searchSessions({ limit: 2, offset: 1 });

      expect(result.sessions).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('title generation', () => {
    beforeEach(async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      mockFs.writeFile.mockResolvedValue(undefined);
      await sessionManager.initialize();
    });

    it('should generate fallback title when no LLM service provided', async () => {
      const session = await sessionManager.createSession('openai', 'gpt-4');
      const testMessage = 'This is a test message for title generation';
      await sessionManager.addMessage(session.id, {
        id: 'msg-1',
        role: 'user',
        content: testMessage,
        timestamp: new Date(),
      });

      const title = await sessionManager.generateSessionTitle(session.id);

      // The message is 43 characters, so it should be truncated to 40 + "..."
      const expectedTitle = testMessage.substring(0, 40) + '...';
      expect(title).toBe(expectedTitle);
    });

    it('should generate fallback title with date when no messages', async () => {
      const session = await sessionManager.createSession('openai', 'gpt-4');
      const title = await sessionManager.generateSessionTitle(session.id);

      expect(title).toMatch(/Chat from \d+\/\d+\/\d+/);
    });

    it('should use LLM service for title generation', async () => {
      const mockLLMService = {
        generateCompletion: vi.fn().mockResolvedValue({
          content: 'Generated Title',
        }),
      };

      const session = await sessionManager.createSession('openai', 'gpt-4');
      await sessionManager.addMessage(session.id, {
        id: 'msg-1',
        role: 'user',
        content: 'Hello, how are you?',
        timestamp: new Date(),
      });

      const title = await sessionManager.generateSessionTitle(session.id, mockLLMService);

      expect(title).toBe('Generated Title');
      expect(mockLLMService.generateCompletion).toHaveBeenCalled();
    });
  });

  describe('statistics', () => {
    beforeEach(async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      mockFs.writeFile.mockResolvedValue(undefined);
      await sessionManager.initialize();
    });

    it('should return session statistics', async () => {
      await sessionManager.createSession('openai', 'gpt-4');
      await sessionManager.createSession('deepseek', 'deepseek-chat');

      const stats = sessionManager.getStatistics();

      expect(stats.totalSessions).toBe(2);
      expect(stats.providerBreakdown.openai).toBe(1);
      expect(stats.providerBreakdown.deepseek).toBe(1);
      expect(stats.averageMessagesPerSession).toBe(0);
    });
  });
});