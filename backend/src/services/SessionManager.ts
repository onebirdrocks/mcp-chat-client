import { promises as fs } from 'fs';
import * as path from 'path';
import { ChatSession, ChatSessionSummary, Message, LLMProvider } from '../types';
import { NotFoundError, InternalServerError, ValidationError } from '../lib/errors';
import { getEncryptionService } from '../lib/encryption';

export interface SessionSearchOptions {
  query?: string;
  provider?: LLMProvider;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface SessionStorage {
  sessions: Record<string, ChatSession>;
  metadata: {
    lastCleanup: string;
    totalSessions: number;
    version: string;
    encrypted: boolean;
  };
}

export interface SessionExport {
  version: string;
  exportDate: string;
  sessions: ChatSession[];
  metadata: {
    totalSessions: number;
    dateRange: {
      earliest: string;
      latest: string;
    };
  };
}

export class SessionManager {
  private readonly storageDir: string;
  private readonly storageFile: string;
  private readonly maxSessions: number;
  private readonly cleanupIntervalMs: number;
  private readonly encryptionService = getEncryptionService();
  private storage: SessionStorage;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    storageDir: string = './data/sessions',
    maxSessions: number = 1000,
    cleanupIntervalMs: number = 24 * 60 * 60 * 1000 // 24 hours
  ) {
    this.storageDir = storageDir;
    this.storageFile = path.join(storageDir, 'sessions.json');
    this.maxSessions = maxSessions;
    this.cleanupIntervalMs = cleanupIntervalMs;
    this.storage = {
      sessions: {},
      metadata: {
        lastCleanup: new Date().toISOString(),
        totalSessions: 0,
        version: '1.0.0',
        encrypted: false,
      },
    };
  }

  /**
   * Initialize the session manager and load existing sessions
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureStorageDirectory();
      await this.loadSessions();
      this.startCleanupTimer();
    } catch (error) {
      console.error('Failed to initialize SessionManager:', error);
      throw new InternalServerError('Failed to initialize session storage');
    }
  }

  /**
   * Create a new chat session
   */
  async createSession(
    provider: LLMProvider,
    model: string,
    mcpServers: string[] = [],
    initialMessage?: Message
  ): Promise<ChatSession> {
    const sessionId = this.generateSessionId();
    const now = new Date();

    const session: ChatSession = {
      id: sessionId,
      title: 'New Chat', // Will be updated with auto-generated title
      messages: initialMessage ? [initialMessage] : [],
      createdAt: now,
      updatedAt: now,
      provider,
      model,
      mcpServers,
    };

    this.storage.sessions[sessionId] = session;
    this.storage.metadata.totalSessions = Object.keys(this.storage.sessions).length;

    await this.saveSessions();
    return session;
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<ChatSession> {
    const session = this.storage.sessions[sessionId];
    if (!session) {
      throw new NotFoundError(`Session with ID ${sessionId} not found`);
    }
    return { ...session }; // Return a copy to prevent mutations
  }

  /**
   * Update an existing session
   */
  async updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession> {
    const session = this.storage.sessions[sessionId];
    if (!session) {
      throw new NotFoundError(`Session with ID ${sessionId} not found`);
    }

    // Prevent updating immutable fields
    const { id, createdAt, ...allowedUpdates } = updates;
    
    const updatedSession = {
      ...session,
      ...allowedUpdates,
      updatedAt: new Date(),
    };

    this.storage.sessions[sessionId] = updatedSession;
    await this.saveSessions();
    
    return { ...updatedSession };
  }

  /**
   * Add a message to a session
   */
  async addMessage(sessionId: string, message: Message): Promise<ChatSession> {
    const session = this.storage.sessions[sessionId];
    if (!session) {
      throw new NotFoundError(`Session with ID ${sessionId} not found`);
    }

    session.messages.push(message);
    session.updatedAt = new Date();

    this.storage.sessions[sessionId] = session;
    await this.saveSessions();

    return { ...session };
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!this.storage.sessions[sessionId]) {
      throw new NotFoundError(`Session with ID ${sessionId} not found`);
    }

    delete this.storage.sessions[sessionId];
    this.storage.metadata.totalSessions = Object.keys(this.storage.sessions).length;
    
    await this.saveSessions();
  }

  /**
   * Search and filter sessions
   */
  async searchSessions(options: SessionSearchOptions = {}): Promise<{
    sessions: ChatSessionSummary[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      query,
      provider,
      limit = 50,
      offset = 0,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = options;

    let sessions = Object.values(this.storage.sessions);

    // Apply filters
    if (query) {
      const searchQuery = query.toLowerCase();
      sessions = sessions.filter(session => 
        session.title.toLowerCase().includes(searchQuery) ||
        session.messages.some((msg: any) => 
          msg.content.toLowerCase().includes(searchQuery)
        )
      );
    }

    if (provider) {
      sessions = sessions.filter(session => session.provider === provider);
    }

    // Sort sessions
    sessions.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      let comparison = 0;
      if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = sessions.length;
    const paginatedSessions = sessions.slice(offset, offset + limit);

    // Convert to summary format
    const sessionSummaries: ChatSessionSummary[] = paginatedSessions.map(session => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messageCount: session.messages.length,
      provider: session.provider,
      model: session.model,
    }));

    return {
      sessions: sessionSummaries,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get all sessions (for API compatibility)
   */
  async getAllSessions(): Promise<ChatSession[]> {
    return Object.values(this.storage.sessions);
  }

  /**
   * Generate automatic session title using LLM
   */
  async generateSessionTitle(sessionId: string, llmService?: any): Promise<string> {
    const session = this.storage.sessions[sessionId];
    if (!session) {
      throw new NotFoundError(`Session with ID ${sessionId} not found`);
    }

    // If no LLM service provided or no messages, use fallback
    if (!llmService || session.messages.length === 0) {
      return this.generateFallbackTitle(session);
    }

    try {
      // Get first few messages for context
      const contextMessages = session.messages
        .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
        .slice(0, 4)
        .map((msg: any) => `${msg.role}: ${msg.content.substring(0, 200)}`)
        .join('\n');

      const titlePrompt = `Based on this conversation, generate a concise, descriptive title (max 50 characters):

${contextMessages}

Title:`;

      const response = await llmService.generateCompletion({
        messages: [{ role: 'user', content: titlePrompt }],
        maxTokens: 20,
        temperature: 0.3,
      });

      const generatedTitle = response.content
        ?.trim()
        .replace(/^["']|["']$/g, '') // Remove quotes
        .substring(0, 50) // Ensure max length
        || this.generateFallbackTitle(session);

      // Update session with new title
      await this.updateSession(sessionId, { title: generatedTitle });
      
      return generatedTitle;
    } catch (error) {
      console.error('Failed to generate session title:', error);
      return this.generateFallbackTitle(session);
    }
  }

  /**
   * Clean up old sessions based on age and count limits
   */
  async cleanupSessions(): Promise<{ deletedCount: number }> {
    const sessions = Object.values(this.storage.sessions);
    const now = new Date();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    let deletedCount = 0;

    // Delete sessions older than maxAge
    const oldSessions = sessions.filter(session => 
      now.getTime() - session.updatedAt.getTime() > maxAge
    );

    for (const session of oldSessions) {
      delete this.storage.sessions[session.id];
      deletedCount++;
    }

    // If still over limit, delete oldest sessions
    const remainingSessions = Object.values(this.storage.sessions);
    if (remainingSessions.length > this.maxSessions) {
      const sortedSessions = remainingSessions.sort(
        (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime()
      );
      
      const sessionsToDelete = sortedSessions.slice(
        0, 
        remainingSessions.length - this.maxSessions
      );

      for (const session of sessionsToDelete) {
        delete this.storage.sessions[session.id];
        deletedCount++;
      }
    }

    this.storage.metadata.lastCleanup = now.toISOString();
    this.storage.metadata.totalSessions = Object.keys(this.storage.sessions).length;

    if (deletedCount > 0) {
      await this.saveSessions();
    }

    return { deletedCount };
  }

  /**
   * Get session statistics
   */
  getStatistics(): {
    totalSessions: number;
    lastCleanup: string;
    providerBreakdown: Record<LLMProvider, number>;
    averageMessagesPerSession: number;
  } {
    const sessions = Object.values(this.storage.sessions);
    const providerBreakdown: Record<LLMProvider, number> = {
      openai: 0,
      deepseek: 0,
      openrouter: 0,
    };

    let totalMessages = 0;
    sessions.forEach(session => {
      providerBreakdown[session.provider]++;
      totalMessages += session.messages.length;
    });

    return {
      totalSessions: sessions.length,
      lastCleanup: this.storage.metadata.lastCleanup,
      providerBreakdown,
      averageMessagesPerSession: sessions.length > 0 ? totalMessages / sessions.length : 0,
    };
  }

  /**
   * Export chat history for backup
   */
  async exportChatHistory(options: {
    sessionIds?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    includeSystemMessages?: boolean;
  } = {}): Promise<SessionExport> {
    const { sessionIds, dateFrom, dateTo, includeSystemMessages = false } = options;
    
    let sessions = Object.values(this.storage.sessions);
    
    // Filter by session IDs if specified
    if (sessionIds && sessionIds.length > 0) {
      sessions = sessions.filter(session => sessionIds.includes(session.id));
    }
    
    // Filter by date range
    if (dateFrom) {
      sessions = sessions.filter(session => session.createdAt >= dateFrom);
    }
    
    if (dateTo) {
      sessions = sessions.filter(session => session.createdAt <= dateTo);
    }
    
    // Filter messages if needed
    const exportSessions = sessions.map(session => ({
      ...session,
      messages: includeSystemMessages 
        ? session.messages 
        : session.messages.filter((msg: any) => msg.role !== 'system'),
    }));
    
    // Calculate metadata
    const dates = exportSessions.map(s => s.createdAt).sort();
    const earliest = dates.length > 0 ? dates[0].toISOString() : new Date().toISOString();
    const latest = dates.length > 0 ? dates[dates.length - 1].toISOString() : new Date().toISOString();
    
    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      sessions: exportSessions,
      metadata: {
        totalSessions: exportSessions.length,
        dateRange: {
          earliest,
          latest,
        },
      },
    };
  }

  /**
   * Import chat history from backup
   */
  async importChatHistory(exportData: SessionExport, options: {
    overwriteExisting?: boolean;
    generateNewIds?: boolean;
  } = {}): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const { overwriteExisting = false, generateNewIds = false } = options;
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    try {
      if (exportData.version !== '1.0.0') {
        throw new ValidationError('Unsupported export version');
      }
      
      for (const session of exportData.sessions) {
        try {
          let sessionId = session.id;
          
          // Generate new ID if requested or if conflict exists
          if (generateNewIds || (this.storage.sessions[sessionId] && !overwriteExisting)) {
            sessionId = this.generateSessionId();
          }
          
          // Skip if session exists and not overwriting
          if (this.storage.sessions[sessionId] && !overwriteExisting) {
            skipped++;
            continue;
          }
          
          // Import session with new ID if needed
          const importedSession: ChatSession = {
            ...session,
            id: sessionId,
            // Ensure dates are Date objects
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt),
            messages: session.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
          };
          
          this.storage.sessions[sessionId] = importedSession;
          imported++;
        } catch (error) {
          errors.push(`Failed to import session ${session.id}: ${error}`);
        }
      }
      
      this.storage.metadata.totalSessions = Object.keys(this.storage.sessions).length;
      await this.saveSessions();
      
      return { imported, skipped, errors };
    } catch (error) {
      console.error('Failed to import chat history:', error);
      throw new InternalServerError('Failed to import chat history');
    }
  }

  /**
   * Secure cleanup - permanently delete sessions and clear sensitive data
   */
  async secureCleanup(options: {
    olderThanDays?: number;
    sessionIds?: string[];
    clearAllSensitiveData?: boolean;
  } = {}): Promise<{ deletedSessions: number; clearedData: boolean }> {
    const { olderThanDays = 30, sessionIds, clearAllSensitiveData = false } = options;
    
    let deletedSessions = 0;
    const now = new Date();
    const maxAge = olderThanDays * 24 * 60 * 60 * 1000;
    
    // Delete specific sessions if provided
    if (sessionIds && sessionIds.length > 0) {
      for (const sessionId of sessionIds) {
        if (this.storage.sessions[sessionId]) {
          delete this.storage.sessions[sessionId];
          deletedSessions++;
        }
      }
    } else {
      // Delete old sessions
      const sessions = Object.values(this.storage.sessions);
      const oldSessions = sessions.filter(session => 
        now.getTime() - session.updatedAt.getTime() > maxAge
      );
      
      for (const session of oldSessions) {
        delete this.storage.sessions[session.id];
        deletedSessions++;
      }
    }
    
    // Clear sensitive data from remaining sessions if requested
    let clearedData = false;
    if (clearAllSensitiveData) {
      Object.values(this.storage.sessions).forEach(session => {
        session.messages = session.messages.map((message: any) => ({
          ...message,
          // Remove any potential sensitive content patterns
          content: this.sanitizeMessageContent(message.content),
        }));
      });
      clearedData = true;
    }
    
    this.storage.metadata.totalSessions = Object.keys(this.storage.sessions).length;
    this.storage.metadata.lastCleanup = now.toISOString();
    
    await this.saveSessions();
    
    return { deletedSessions, clearedData };
  }

  /**
   * Get privacy and security statistics
   */
  getPrivacyStatistics(): {
    totalSessions: number;
    totalMessages: number;
    oldestSession: string | null;
    newestSession: string | null;
    averageSessionAge: number;
    sessionsWithSensitiveData: number;
    lastCleanup: string;
  } {
    const sessions = Object.values(this.storage.sessions);
    const now = new Date();
    
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalMessages: 0,
        oldestSession: null,
        newestSession: null,
        averageSessionAge: 0,
        sessionsWithSensitiveData: 0,
        lastCleanup: this.storage.metadata.lastCleanup,
      };
    }
    
    const sortedByDate = sessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);
    
    const totalAge = sessions.reduce((sum, session) => 
      sum + (now.getTime() - session.createdAt.getTime()), 0
    );
    const averageSessionAge = totalAge / sessions.length / (24 * 60 * 60 * 1000); // in days
    
    // Count sessions that might contain sensitive data (API keys, tokens, etc.)
    const sensitivePatterns = [/api[_-]?key/i, /token/i, /secret/i, /password/i];
    const sessionsWithSensitiveData = sessions.filter(session =>
      session.messages.some((message: any) =>
        sensitivePatterns.some(pattern => pattern.test(message.content))
      )
    ).length;
    
    return {
      totalSessions: sessions.length,
      totalMessages,
      oldestSession: sortedByDate[0].createdAt.toISOString(),
      newestSession: sortedByDate[sortedByDate.length - 1].createdAt.toISOString(),
      averageSessionAge,
      sessionsWithSensitiveData,
      lastCleanup: this.storage.metadata.lastCleanup,
    };
  }

  /**
   * Shutdown the session manager
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    await this.saveSessions();
  }

  // Private methods

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFallbackTitle(session: ChatSession): string {
    const userMessages = session.messages.filter((msg: any) => msg.role === 'user');
    if (userMessages.length > 0) {
      const originalMessage = userMessages[0].content;
      const truncatedMessage = originalMessage.substring(0, 40);
      return originalMessage.length > 40 ? `${truncatedMessage}...` : truncatedMessage;
    }
    
    const date = session.createdAt.toLocaleDateString();
    return `Chat from ${date}`;
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      throw new InternalServerError(`Failed to create storage directory: ${error}`);
    }
  }

  private async loadSessions(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFile, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Convert date strings back to Date objects
      Object.values(parsed.sessions).forEach((session: any) => {
        session.createdAt = new Date(session.createdAt);
        session.updatedAt = new Date(session.updatedAt);
        session.messages.forEach((message: any) => {
          message.timestamp = new Date(message.timestamp);
        });
      });
      
      this.storage = parsed;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, start with empty storage
        this.storage = {
          sessions: {},
          metadata: {
            lastCleanup: new Date().toISOString(),
            totalSessions: 0,
            version: '1.0.0',
            encrypted: false,
          },
        };
        await this.saveSessions();
      } else {
        console.error('Failed to load sessions:', error);
        throw new InternalServerError('Failed to load session data');
      }
    }
  }

  private async saveSessions(): Promise<void> {
    try {
      const data = JSON.stringify(this.storage, null, 2);
      await fs.writeFile(this.storageFile, data, 'utf-8');
    } catch (error) {
      console.error('Failed to save sessions:', error);
      throw new InternalServerError('Failed to save session data');
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupSessions();
      } catch (error) {
        console.error('Automatic cleanup failed:', error);
      }
    }, this.cleanupIntervalMs);
  }

  private sanitizeMessageContent(content: string): string {
    // Remove potential API keys, tokens, and other sensitive data
    const sensitivePatterns = [
      /sk-[a-zA-Z0-9]{20,}/g, // OpenAI-style API keys
      /sk-or-[a-zA-Z0-9]{30,}/g, // OpenRouter API keys
      /Bearer\s+[a-zA-Z0-9]{20,}/g, // Bearer tokens
      /[a-zA-Z0-9]{32,}/g, // Long alphanumeric strings (potential tokens)
    ];
    
    let sanitized = content;
    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    
    return sanitized;
  }
}

// Singleton instance
let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
}

export async function initializeSessionManager(): Promise<SessionManager> {
  const manager = getSessionManager();
  await manager.initialize();
  return manager;
}