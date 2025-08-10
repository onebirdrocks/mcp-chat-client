import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../SessionManager';
import { Message } from '../../types';
import { LLMService } from '../LLMService';
import { LLMService } from '../LLMService';

// Simple in-memory test without file system mocking
describe('SessionManager - Basic Functionality', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    // Create a new instance for each test with a unique storage directory
    const testDir = `./test-sessions-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionManager = new SessionManager({
      storageDir: testDir,
      maxSessions: 5,
      cleanupIntervalMs: 60000, // 1 minute for testing
      autoCleanupDays: 1,
    });
  });

  afterEach(async () => {
    await sessionManager.shutdown();
  });

  describe('session creation and management', () => {
    it('should create a new session with correct properties', async () => {
      const session = await sessionManager.createSession('openai', 'gpt-4', ['server1']);

      expect(session.id).toBeDefined();
      expect(session.id).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(session.title).toBe('New Chat');
      expect(session.provider).toBe('openai');
      expect(session.model).toBe('gpt-4');
      expect(session.mcpServers).toEqual(['server1']);
      expect(session.messages).toEqual([]);
      expect(session.totalTokens).toBe(0);
      expect(session.estimatedCost).toBe(0);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a session with initial message', async () => {
      const initialMessage: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello, world!',
        timestamp: new Date(),
      };

      const session = await sessionManager.createSession('deepseek', 'deepseek-chat', [], initialMessage);

      expect(session.messages).toHaveLength(1);
      expect(session.messages[0]).toEqual(initialMessage);
    });

    it('should retrieve an existing session', async () => {
      const createdSession = await sessionManager.createSession('openai', 'gpt-4');
      const retrievedSession = await sessionManager.getSession(createdSession.id);

      expect(retrievedSession.id).toBe(createdSession.id);
      expect(retrievedSession.title).toBe(createdSession.title);
      expect(retrievedSession.provider).toBe(createdSession.provider);
      expect(retrievedSession.model).toBe(createdSession.model);
    });

    it('should throw error when getting non-existent session', async () => {
      await expect(sessionManager.getSession('non-existent-id')).rejects.toThrow('Session with ID non-existent-id not found');
    });

    it('should update session properties', async () => {
      const session = await sessionManager.createSession('openai', 'gpt-4');
      const originalUpdatedAt = session.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const updatedSession = await sessionManager.updateSession(session.id, {
        title: 'Updated Title',
        totalTokens: 150,
        estimatedCost: 0.05,
      });

      expect(updatedSession.title).toBe('Updated Title');
      expect(updatedSession.totalTokens).toBe(150);
      expect(updatedSession.estimatedCost).toBe(0.05);
      expect(updatedSession.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      expect(updatedSession.id).toBe(session.id); // ID should not change
      expect(updatedSession.createdAt).toEqual(session.createdAt); // createdAt should not change
    });

    it('should add messages to a session', async () => {
      const session = await sessionManager.createSession('openai', 'gpt-4');
      
      const message1: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
        metadata: { tokenCount: 5 },
      };

      const message2: Message = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date(),
        metadata: { tokenCount: 10 },
      };

      const sessionAfterMsg1 = await sessionManager.addMessage(session.id, message1);
      expect(sessionAfterMsg1.messages).toHaveLength(1);
      expect(sessionAfterMsg1.totalTokens).toBe(5);

      const sessionAfterMsg2 = await sessionManager.addMessage(session.id, message2);
      expect(sessionAfterMsg2.messages).toHaveLength(2);
      expect(sessionAfterMsg2.totalTokens).toBe(15);
      expect(sessionAfterMsg2.messages[0]).toEqual(message1);
      expect(sessionAfterMsg2.messages[1]).toEqual(message2);
    });

    it('should delete a session', async () => {
      const session = await sessionManager.createSession('openai', 'gpt-4');
      
      await sessionManager.deleteSession(session.id);
      
      await expect(sessionManager.getSession(session.id)).rejects.toThrow('not found');
    });

    it('should delete multiple sessions', async () => {
      const session1 = await sessionManager.createSession('openai', 'gpt-4');
      const session2 = await sessionManager.createSession('deepseek', 'deepseek-chat');
      
      const result = await sessionManager.deleteSessions([session1.id, session2.id, 'non-existent']);

      expect(result.deleted).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('non-existent');

      await expect(sessionManager.getSession(session1.id)).rejects.toThrow('not found');
      await expect(sessionManager.getSession(session2.id)).rejects.toThrow('not found');
    });
  });

  describe('session search and filtering', () => {
    beforeEach(async () => {
      // Create test sessions
      const session1 = await sessionManager.createSession('openai', 'gpt-4');
      await sessionManager.updateSession(session1.id, { title: 'OpenAI Chat' });

      const session2 = await sessionManager.createSession('deepseek', 'deepseek-chat');
      await sessionManager.updateSession(session2.id, { title: 'DeepSeek Discussion' });

      const session3 = await sessionManager.createSession('openai', 'gpt-3.5-turbo');
      await sessionManager.updateSession(session3.id, { title: 'Special Project Chat' });

      // Add a message to one session for content search testing
      await sessionManager.addMessage(session3.id, {
        id: 'msg-1',
        role: 'user',
        content: 'This is a unique message for testing search functionality',
        timestamp: new Date(),
      });
    });

    it('should search sessions by title query', async () => {
      const result = await sessionManager.searchSessions({ query: 'Special' });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].title).toBe('Special Project Chat');
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should search sessions by message content', async () => {
      const result = await sessionManager.searchSessions({ query: 'unique message' });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].title).toBe('Special Project Chat');
    });

    it('should filter sessions by provider', async () => {
      const result = await sessionManager.searchSessions({ provider: 'openai' });

      expect(result.sessions).toHaveLength(2);
      expect(result.sessions.every(s => s.provider === 'openai')).toBe(true);
    });

    it('should apply pagination correctly', async () => {
      const result = await sessionManager.searchSessions({ limit: 2, offset: 1 });

      expect(result.sessions).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should sort sessions by title', async () => {
      const result = await sessionManager.searchSessions({ 
        sortBy: 'title', 
        sortOrder: 'asc' 
      });

      expect(result.sessions[0].title).toBe('DeepSeek Discussion');
      expect(result.sessions[1].title).toBe('OpenAI Chat');
      expect(result.sessions[2].title).toBe('Special Project Chat');
    });
  });

  describe('title generation', () => {
    it('should generate fallback title from first user message', async () => {
      const session = await sessionManager.createSession('openai', 'gpt-4');
      
      await sessionManager.addMessage(session.id, {
        id: 'msg-1',
        role: 'user',
        content: 'This is a test message for title generation',
        timestamp: new Date(),
      });

      const title = await sessionManager.generateSessionTitle(session.id);

      expect(title).toBe('This is a test message for title generat...');
    });

    it('should truncate long messages for title', async () => {
      const session = await sessionManager.createSession('openai', 'gpt-4');
      
      const longMessage = 'This is a very long message that exceeds the 40 character limit for title generation';
      await sessionManager.addMessage(session.id, {
        id: 'msg-1',
        role: 'user',
        content: longMessage,
        timestamp: new Date(),
      });

      const title = await sessionManager.generateSessionTitle(session.id);

      expect(title).toBe('This is a very long message that exceeds...');
      expect(title).toHaveLength(43); // 40 chars + "..."
    });

    it('should generate date-based title when no messages', async () => {
      const session = await sessionManager.createSession('openai', 'gpt-4');
      
      const title = await sessionManager.generateSessionTitle(session.id);

      expect(title).toMatch(/^Chat from \d{1,2}\/\d{1,2}\/\d{4}$/);
    });

    it('should use LLM service for intelligent title generation', async () => {
      const mockLLMService = {
        chat: vi.fn().mockResolvedValue({
          reply: 'AI Discussion',
        }),
      } as any as LLMService;

      const session = await sessionManager.createSession('openai', 'gpt-4');
      await sessionManager.addMessage(session.id, {
        id: 'msg-1',
        role: 'user',
        content: 'Tell me about artificial intelligence',
        timestamp: new Date(),
      });

      const title = await sessionManager.generateSessionTitle(session.id, mockLLMService);

      expect(title).toBe('AI Discussion');
      expect(mockLLMService.chat).toHaveBeenCalledWith('openai', {
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('generate a concise, descriptive title'),
          }),
        ]),
        maxTokens: 20,
        temperature: 0.3,
      });
    });

    it('should fallback to simple title when LLM service fails', async () => {
      const mockLLMService = {
        chat: vi.fn().mockRejectedValue(new Error('LLM service error')),
      } as any as LLMService;

      const session = await sessionManager.createSession('openai', 'gpt-4');
      await sessionManager.addMessage(session.id, {
        id: 'msg-1',
        role: 'user',
        content: 'Hello, how are you?',
        timestamp: new Date(),
      });

      const title = await sessionManager.generateSessionTitle(session.id, mockLLMService);

      expect(title).toBe('Hello, how are you?');
    });
  });

  describe('statistics', () => {
    it('should return correct statistics', async () => {
      // Create test sessions
      const session1 = await sessionManager.createSession('openai', 'gpt-4');
      const session2 = await sessionManager.createSession('deepseek', 'deepseek-chat');
      
      // Add messages
      await sessionManager.addMessage(session1.id, {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      });
      
      await sessionManager.addMessage(session2.id, {
        id: 'msg-2',
        role: 'user',
        content: 'My API key is sk-1234567890abcdef',
        timestamp: new Date(),
      });

      const stats = sessionManager.getStatistics();

      expect(stats.totalSessions).toBe(2);
      expect(stats.totalMessages).toBe(2);
      expect(stats.providerBreakdown.openai).toBe(1);
      expect(stats.providerBreakdown.deepseek).toBe(1);
      expect(stats.averageMessagesPerSession).toBe(1);
      expect(stats.sessionsWithSensitiveData).toBe(1);
      expect(stats.oldestSession).toBeDefined();
      expect(stats.newestSession).toBeDefined();
      expect(stats.averageSessionAge).toBeGreaterThanOrEqual(0);
    });

    it('should return empty statistics when no sessions', async () => {
      const stats = sessionManager.getStatistics();

      expect(stats.totalSessions).toBe(0);
      expect(stats.totalMessages).toBe(0);
      expect(stats.averageMessagesPerSession).toBe(0);
      expect(stats.oldestSession).toBeNull();
      expect(stats.newestSession).toBeNull();
      expect(stats.sessionsWithSensitiveData).toBe(0);
    });
  });

  describe('export and import', () => {
    it('should export chat history correctly', async () => {
      const session = await sessionManager.createSession('openai', 'gpt-4');
      await sessionManager.updateSession(session.id, { title: 'Test Session' });
      
      await sessionManager.addMessage(session.id, {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      });

      const exportData = await sessionManager.exportChatHistory();

      expect(exportData.version).toBe('1.0.0');
      expect(exportData.sessions).toHaveLength(1);
      expect(exportData.sessions[0].id).toBe(session.id);
      expect(exportData.sessions[0].title).toBe('Test Session');
      expect(exportData.metadata.totalSessions).toBe(1);
      expect(exportData.exportDate).toBeDefined();
    });

    it('should import chat history correctly', async () => {
      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        sessions: [{
          id: 'imported-session',
          title: 'Imported Session',
          messages: [{
            id: 'msg-1',
            role: 'user' as const,
            content: 'Imported message',
            timestamp: new Date(),
          }],
          createdAt: new Date(),
          updatedAt: new Date(),
          provider: 'openai',
          model: 'gpt-4',
          mcpServers: [],
          totalTokens: 0,
          estimatedCost: 0,
        }],
        metadata: {
          totalSessions: 1,
          dateRange: {
            earliest: new Date().toISOString(),
            latest: new Date().toISOString(),
          },
        },
      };

      const result = await sessionManager.importChatHistory(exportData);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      const importedSession = await sessionManager.getSession('imported-session');
      expect(importedSession.title).toBe('Imported Session');
      expect(importedSession.messages).toHaveLength(1);
    });
  });

  describe('cleanup functionality', () => {
    it('should sanitize sensitive content', async () => {
      const session = await sessionManager.createSession('openai', 'gpt-4');
      await sessionManager.addMessage(session.id, {
        id: 'msg-1',
        role: 'user',
        content: 'My API key is sk-1234567890abcdef and my token is Bearer abc123def456',
        timestamp: new Date(),
      });

      const result = await sessionManager.secureCleanup({
        clearAllSensitiveData: true,
      });

      expect(result.clearedData).toBe(true);
      
      const updatedSession = await sessionManager.getSession(session.id);
      expect(updatedSession.messages[0].content).toContain('[REDACTED]');
      expect(updatedSession.messages[0].content).not.toContain('sk-1234567890abcdef');
      expect(updatedSession.messages[0].content).not.toContain('Bearer abc123def456');
    });
  });
});