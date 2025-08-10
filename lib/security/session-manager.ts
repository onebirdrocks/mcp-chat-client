import { randomBytes, createHash } from 'crypto';
import { SecureStorage } from './secure-storage';
import { EncryptionService } from './encryption';

export interface SessionData {
  id: string;
  userId?: string;
  data: Record<string, any>;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  encrypted: boolean;
}

export interface SessionConfig {
  defaultTimeout: number; // minutes
  maxTimeout: number; // minutes
  cleanupInterval: number; // minutes
  encryptionEnabled: boolean;
  trackUserAgent: boolean;
  trackIpAddress: boolean;
}

export interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  averageSessionDuration: number;
  lastCleanup: Date;
}

export class SecureSessionManager {
  private storage: SecureStorage;
  private encryption: EncryptionService;
  private config: SessionConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private sessions: Map<string, SessionData> = new Map();

  constructor(
    storage: SecureStorage,
    encryption: EncryptionService,
    config: Partial<SessionConfig> = {}
  ) {
    this.storage = storage;
    this.encryption = encryption;
    this.config = {
      defaultTimeout: 60, // 1 hour
      maxTimeout: 1440, // 24 hours
      cleanupInterval: 15, // 15 minutes
      encryptionEnabled: true,
      trackUserAgent: true,
      trackIpAddress: true,
      ...config,
    };

    this.startCleanupTimer();
    this.loadExistingSessions();
  }

  /**
   * Generate a secure session ID
   */
  private generateSessionId(): string {
    const randomData = randomBytes(32);
    const timestamp = Date.now().toString();
    const combined = Buffer.concat([randomData, Buffer.from(timestamp)]);
    return createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions().catch(console.error);
    }, this.config.cleanupInterval * 60 * 1000);
  }

  /**
   * Load existing sessions from storage
   */
  private async loadExistingSessions(): Promise<void> {
    try {
      const sessionKeys = await this.storage.listKeys();
      const sessionKeyPattern = /^session_/;
      
      for (const key of sessionKeys) {
        if (sessionKeyPattern.test(key)) {
          try {
            const sessionData = await this.storage.retrieve<SessionData>(key);
            if (sessionData && new Date(sessionData.expiresAt) > new Date()) {
              this.sessions.set(sessionData.id, sessionData);
            } else if (sessionData) {
              // Clean up expired session
              await this.storage.delete(key);
            }
          } catch (error) {
            console.error(`Failed to load session ${key}:`, error);
            // Clean up corrupted session
            try {
              await this.storage.delete(key);
            } catch {
              // Ignore cleanup errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load existing sessions:', error);
    }
  }

  /**
   * Create a new session
   */
  async createSession(
    data: Record<string, any> = {},
    options: {
      timeout?: number;
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const timeout = Math.min(
      options.timeout || this.config.defaultTimeout,
      this.config.maxTimeout
    );
    const expiresAt = new Date(now.getTime() + timeout * 60 * 1000);

    const sessionData: SessionData = {
      id: sessionId,
      userId: options.userId,
      data,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
      ipAddress: this.config.trackIpAddress ? options.ipAddress : undefined,
      userAgent: this.config.trackUserAgent ? options.userAgent : undefined,
      encrypted: this.config.encryptionEnabled,
    };

    // Store in memory
    this.sessions.set(sessionId, sessionData);

    // Persist to storage (don't pass password, let storage handle encryption)
    await this.storage.store(`session_${sessionId}`, sessionData);

    return sessionId;
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    if (!sessionId) {
      return null;
    }

    // Check memory first
    let sessionData = this.sessions.get(sessionId);
    
    if (!sessionData) {
      // Try to load from storage
      try {
        sessionData = await this.storage.retrieve<SessionData>(`session_${sessionId}`);
        if (sessionData) {
          this.sessions.set(sessionId, sessionData);
        }
      } catch (error) {
        console.error(`Failed to retrieve session ${sessionId}:`, error);
        return null;
      }
    }

    if (!sessionData) {
      return null;
    }

    // Check if session is expired
    if (new Date(sessionData.expiresAt) <= new Date()) {
      await this.destroySession(sessionId);
      return null;
    }

    // Update last accessed time
    sessionData.lastAccessedAt = new Date();
    this.sessions.set(sessionId, sessionData);
    
    // Update in storage (async, don't wait)
    this.storage.store(`session_${sessionId}`, sessionData).catch(console.error);

    return sessionData;
  }

  /**
   * Update session data
   */
  async updateSession(
    sessionId: string,
    data: Record<string, any>,
    extendTimeout?: number
  ): Promise<boolean> {
    const sessionData = await this.getSession(sessionId);
    if (!sessionData) {
      return false;
    }

    // Update data
    sessionData.data = { ...sessionData.data, ...data };
    sessionData.lastAccessedAt = new Date();

    // Extend timeout if requested
    if (extendTimeout) {
      const newTimeout = Math.min(extendTimeout, this.config.maxTimeout);
      sessionData.expiresAt = new Date(Date.now() + newTimeout * 60 * 1000);
    }

    // Update in memory and storage
    this.sessions.set(sessionId, sessionData);
    await this.storage.store(`session_${sessionId}`, sessionData);

    return true;
  }

  /**
   * Extend session timeout
   */
  async extendSession(sessionId: string, additionalMinutes: number): Promise<boolean> {
    const sessionData = await this.getSession(sessionId);
    if (!sessionData) {
      return false;
    }

    const currentExpiry = new Date(sessionData.expiresAt);
    const newExpiry = new Date(currentExpiry.getTime() + additionalMinutes * 60 * 1000);
    const maxExpiry = new Date(Date.now() + this.config.maxTimeout * 60 * 1000);

    // Don't extend beyond max timeout
    sessionData.expiresAt = newExpiry > maxExpiry ? maxExpiry : newExpiry;
    sessionData.lastAccessedAt = new Date();

    // Update in memory and storage
    this.sessions.set(sessionId, sessionData);
    await this.storage.store(`session_${sessionId}`, sessionData);

    return true;
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<void> {
    // Remove from memory
    this.sessions.delete(sessionId);

    // Remove from storage
    await this.storage.delete(`session_${sessionId}`);
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyUserSessions(userId: string): Promise<number> {
    let destroyedCount = 0;
    const sessionsToDestroy: string[] = [];

    // Find all sessions for the user
    for (const [sessionId, sessionData] of this.sessions) {
      if (sessionData.userId === userId) {
        sessionsToDestroy.push(sessionId);
      }
    }

    // Destroy found sessions
    for (const sessionId of sessionsToDestroy) {
      await this.destroySession(sessionId);
      destroyedCount++;
    }

    return destroyedCount;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;
    const expiredSessions: string[] = [];

    // Find expired sessions
    for (const [sessionId, sessionData] of this.sessions) {
      if (new Date(sessionData.expiresAt) <= now) {
        expiredSessions.push(sessionId);
      }
    }

    // Clean up expired sessions
    for (const sessionId of expiredSessions) {
      await this.destroySession(sessionId);
      cleanedCount++;
    }

    return cleanedCount;
  }

  /**
   * Get session metrics
   */
  async getMetrics(): Promise<SessionMetrics> {
    const now = new Date();
    let activeSessions = 0;
    let expiredSessions = 0;
    let totalDuration = 0;

    for (const sessionData of this.sessions.values()) {
      if (new Date(sessionData.expiresAt) > now) {
        activeSessions++;
        const duration = now.getTime() - new Date(sessionData.createdAt).getTime();
        totalDuration += duration;
      } else {
        expiredSessions++;
      }
    }

    const averageSessionDuration = activeSessions > 0 
      ? totalDuration / activeSessions / (1000 * 60) // Convert to minutes
      : 0;

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      expiredSessions,
      averageSessionDuration,
      lastCleanup: new Date(),
    };
  }

  /**
   * Validate session security
   */
  async validateSession(
    sessionId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ valid: boolean; reason?: string }> {
    const sessionData = await this.getSession(sessionId);
    
    if (!sessionData) {
      return { valid: false, reason: 'Session not found' };
    }

    // Check IP address if tracking is enabled
    if (this.config.trackIpAddress && sessionData.ipAddress && ipAddress) {
      if (sessionData.ipAddress !== ipAddress) {
        return { valid: false, reason: 'IP address mismatch' };
      }
    }

    // Check user agent if tracking is enabled
    if (this.config.trackUserAgent && sessionData.userAgent && userAgent) {
      if (sessionData.userAgent !== userAgent) {
        return { valid: false, reason: 'User agent mismatch' };
      }
    }

    return { valid: true };
  }

  /**
   * List active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const userSessions: SessionData[] = [];
    const now = new Date();

    for (const sessionData of this.sessions.values()) {
      if (sessionData.userId === userId && new Date(sessionData.expiresAt) > now) {
        userSessions.push(sessionData);
      }
    }

    return userSessions.sort((a, b) => 
      new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
    );
  }

  /**
   * Shutdown the session manager
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Force cleanup of all sessions (for testing or emergency)
   */
  async forceCleanup(): Promise<void> {
    const sessionKeys = await this.storage.listKeys();
    const sessionKeyPattern = /^session_/;
    
    for (const key of sessionKeys) {
      if (sessionKeyPattern.test(key)) {
        await this.storage.delete(key);
      }
    }
    
    this.sessions.clear();
  }
}