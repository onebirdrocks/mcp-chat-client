import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecureSessionManager } from '../session-manager';
import { SecureStorage } from '../secure-storage';
import { EncryptionService } from '../encryption';

describe('SecureSessionManager', () => {
  let sessionManager: SecureSessionManager;
  let storage: SecureStorage;
  let encryption: EncryptionService;
  const testPassword = 'test-password-123';

  beforeEach(async () => {
    encryption = new EncryptionService();
    await encryption.initialize(testPassword);
    
    // Use unique directory for each test to avoid interference
    const testDir = `test-sessions-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    storage = new SecureStorage(encryption, {
      baseDir: testDir,
      encryptionEnabled: false, // Disable encryption for simpler testing
      backupEnabled: false,
    });

    sessionManager = new SecureSessionManager(storage, encryption, {
      defaultTimeout: 30, // 30 minutes for testing
      maxTimeout: 120, // 2 hours max
      cleanupInterval: 1, // 1 minute for testing
      encryptionEnabled: false, // Disable encryption for simpler testing
      trackUserAgent: true,
      trackIpAddress: true,
    });
  });

  afterEach(() => {
    sessionManager.shutdown();
    encryption.clearSensitiveData();
  });

  describe('session creation', () => {
    it('should create a new session', async () => {
      const sessionData = { userId: 'user123', preferences: { theme: 'dark' } };
      const sessionId = await sessionManager.createSession(sessionData);
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('should create session with custom timeout', async () => {
      const sessionData = { userId: 'user123' };
      const sessionId = await sessionManager.createSession(sessionData, { timeout: 60 });
      
      const session = await sessionManager.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session!.id).toBe(sessionId);
      
      const timeoutDiff = new Date(session!.expiresAt).getTime() - new Date().getTime();
      expect(timeoutDiff).toBeGreaterThan(55 * 60 * 1000); // At least 55 minutes
      expect(timeoutDiff).toBeLessThan(65 * 60 * 1000); // Less than 65 minutes
    });

    it('should limit timeout to maximum allowed', async () => {
      const sessionData = { userId: 'user123' };
      const sessionId = await sessionManager.createSession(sessionData, { timeout: 200 }); // Exceeds max
      
      const session = await sessionManager.getSession(sessionId);
      const timeoutDiff = new Date(session!.expiresAt).getTime() - new Date().getTime();
      expect(timeoutDiff).toBeLessThan(125 * 60 * 1000); // Should be limited to max timeout
    });

    it('should track IP address and user agent when enabled', async () => {
      const sessionData = { userId: 'user123' };
      const sessionId = await sessionManager.createSession(sessionData, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      });
      
      const session = await sessionManager.getSession(sessionId);
      expect(session!.ipAddress).toBe('192.168.1.1');
      expect(session!.userAgent).toBe('Mozilla/5.0 Test Browser');
    });
  });

  describe('session retrieval', () => {
    it('should retrieve existing session', async () => {
      const sessionData = { key: 'value' };
      const sessionId = await sessionManager.createSession(sessionData, { userId: 'user123' });
      
      const retrieved = await sessionManager.getSession(sessionId);
      
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(sessionId);
      expect(retrieved!.userId).toBe('user123');
      expect(retrieved!.data).toEqual({ key: 'value' });
    });

    it('should return null for non-existent session', async () => {
      const result = await sessionManager.getSession('non-existent-session-id');
      expect(result).toBeNull();
    });

    it('should return null for expired session', async () => {
      // Create session with very short timeout
      const sessionData = { userId: 'user123' };
      const sessionId = await sessionManager.createSession(sessionData, { timeout: 0.01 }); // 0.6 seconds
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await sessionManager.getSession(sessionId);
      expect(result).toBeNull();
    });

    it('should update last accessed time on retrieval', async () => {
      const sessionData = { userId: 'user123' };
      const sessionId = await sessionManager.createSession(sessionData);
      
      const session1 = await sessionManager.getSession(sessionId);
      const firstAccess = new Date(session1!.lastAccessedAt);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const session2 = await sessionManager.getSession(sessionId);
      const secondAccess = new Date(session2!.lastAccessedAt);
      
      expect(secondAccess.getTime()).toBeGreaterThan(firstAccess.getTime());
    });
  });

  describe('session updates', () => {
    it('should update session data', async () => {
      const sessionData = { count: 1 };
      const sessionId = await sessionManager.createSession(sessionData, { userId: 'user123' });
      
      const success = await sessionManager.updateSession(sessionId, { count: 2, newField: 'added' });
      expect(success).toBe(true);
      
      const updated = await sessionManager.getSession(sessionId);
      expect(updated!.data.count).toBe(2);
      expect(updated!.data.newField).toBe('added');
    });

    it('should extend timeout when updating', async () => {
      const sessionData = {};
      const sessionId = await sessionManager.createSession(sessionData, { userId: 'user123' });
      
      const originalSession = await sessionManager.getSession(sessionId);
      const originalExpiry = new Date(originalSession!.expiresAt);
      
      const success = await sessionManager.updateSession(sessionId, { updated: true }, 60);
      expect(success).toBe(true);
      
      const updatedSession = await sessionManager.getSession(sessionId);
      const newExpiry = new Date(updatedSession!.expiresAt);
      
      expect(newExpiry.getTime()).toBeGreaterThan(originalExpiry.getTime());
    });

    it('should fail to update non-existent session', async () => {
      const success = await sessionManager.updateSession('non-existent', { data: 'test' });
      expect(success).toBe(false);
    });
  });

  describe('session extension', () => {
    it('should extend session timeout', async () => {
      const sessionData = {};
      const sessionId = await sessionManager.createSession(sessionData, { userId: 'user123' });
      
      const originalSession = await sessionManager.getSession(sessionId);
      const originalExpiry = new Date(originalSession!.expiresAt);
      
      const success = await sessionManager.extendSession(sessionId, 30);
      expect(success).toBe(true);
      
      const extendedSession = await sessionManager.getSession(sessionId);
      const newExpiry = new Date(extendedSession!.expiresAt);
      
      const extensionTime = newExpiry.getTime() - originalExpiry.getTime();
      expect(extensionTime).toBeGreaterThan(25 * 60 * 1000); // At least 25 minutes
    });

    it('should not extend beyond maximum timeout', async () => {
      const sessionData = {};
      const sessionId = await sessionManager.createSession(sessionData, { userId: 'user123' });
      
      const success = await sessionManager.extendSession(sessionId, 200); // Exceeds max
      expect(success).toBe(true);
      
      const session = await sessionManager.getSession(sessionId);
      const timeUntilExpiry = new Date(session!.expiresAt).getTime() - new Date().getTime();
      expect(timeUntilExpiry).toBeLessThan(125 * 60 * 1000); // Should be limited
    });
  });

  describe('session destruction', () => {
    it('should destroy single session', async () => {
      const sessionData = {};
      const sessionId = await sessionManager.createSession(sessionData, { userId: 'user123' });
      
      expect(await sessionManager.getSession(sessionId)).toBeDefined();
      
      await sessionManager.destroySession(sessionId);
      
      expect(await sessionManager.getSession(sessionId)).toBeNull();
    });

    it('should destroy all user sessions', async () => {
      const userId = 'user123';
      const sessionId1 = await sessionManager.createSession({}, { userId });
      const sessionId2 = await sessionManager.createSession({}, { userId });
      const sessionId3 = await sessionManager.createSession({}, { userId: 'other-user' });
      
      const destroyedCount = await sessionManager.destroyUserSessions(userId);
      expect(destroyedCount).toBe(2);
      
      expect(await sessionManager.getSession(sessionId1)).toBeNull();
      expect(await sessionManager.getSession(sessionId2)).toBeNull();
      expect(await sessionManager.getSession(sessionId3)).toBeDefined(); // Different user
    });
  });

  describe('session cleanup', () => {
    it('should clean up expired sessions', async () => {
      // Create sessions with very short timeout
      const sessionId1 = await sessionManager.createSession({}, { userId: 'user1', timeout: 0.01 });
      const sessionId2 = await sessionManager.createSession({}, { userId: 'user2', timeout: 0.01 });
      const sessionId3 = await sessionManager.createSession({}, { userId: 'user3', timeout: 60 });
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const cleanedCount = await sessionManager.cleanupExpiredSessions();
      expect(cleanedCount).toBe(2);
      
      expect(await sessionManager.getSession(sessionId1)).toBeNull();
      expect(await sessionManager.getSession(sessionId2)).toBeNull();
      expect(await sessionManager.getSession(sessionId3)).toBeDefined(); // Not expired
    });
  });

  describe('session validation', () => {
    it('should validate session with matching IP and user agent', async () => {
      const sessionId = await sessionManager.createSession(
        { userId: 'user123' },
        { ipAddress: '192.168.1.1', userAgent: 'Test Browser' }
      );
      
      const validation = await sessionManager.validateSession(
        sessionId,
        '192.168.1.1',
        'Test Browser'
      );
      
      expect(validation.valid).toBe(true);
    });

    it('should invalidate session with mismatched IP', async () => {
      const sessionId = await sessionManager.createSession(
        { userId: 'user123' },
        { ipAddress: '192.168.1.1', userAgent: 'Test Browser' }
      );
      
      const validation = await sessionManager.validateSession(
        sessionId,
        '192.168.1.2', // Different IP
        'Test Browser'
      );
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('IP address mismatch');
    });

    it('should invalidate session with mismatched user agent', async () => {
      const sessionId = await sessionManager.createSession(
        { userId: 'user123' },
        { ipAddress: '192.168.1.1', userAgent: 'Test Browser' }
      );
      
      const validation = await sessionManager.validateSession(
        sessionId,
        '192.168.1.1',
        'Different Browser' // Different user agent
      );
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('User agent mismatch');
    });
  });

  describe('session metrics', () => {
    it('should provide session metrics', async () => {
      await sessionManager.createSession({}, { userId: 'user1' });
      await sessionManager.createSession({}, { userId: 'user2' });
      await sessionManager.createSession({}, { userId: 'user3', timeout: 0.01 }); // Will expire
      
      // Wait for one to expire
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const metrics = await sessionManager.getMetrics();
      
      expect(metrics.totalSessions).toBe(3);
      expect(metrics.activeSessions).toBe(2);
      expect(metrics.expiredSessions).toBe(1);
      expect(metrics.averageSessionDuration).toBeGreaterThan(0);
      expect(metrics.lastCleanup).toBeInstanceOf(Date);
    });
  });

  describe('user session listing', () => {
    it('should list active sessions for user', async () => {
      const userId = 'user123';
      await sessionManager.createSession({ session: 1 }, { userId });
      await sessionManager.createSession({ session: 2 }, { userId });
      await sessionManager.createSession({}, { userId: 'other-user' });
      
      const userSessions = await sessionManager.getUserSessions(userId);
      
      expect(userSessions.length).toBe(2);
      expect(userSessions.every(s => s.userId === userId)).toBe(true);
    });

    it('should sort sessions by last accessed time', async () => {
      const userId = 'user123';
      const sessionId1 = await sessionManager.createSession({ order: 1 }, { userId });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const sessionId2 = await sessionManager.createSession({ order: 2 }, { userId });
      
      const userSessions = await sessionManager.getUserSessions(userId);
      
      expect(userSessions.length).toBe(2);
      expect(userSessions[0].data.order).toBe(2); // Most recent first
      expect(userSessions[1].data.order).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      // Mock storage to throw error
      const mockStorage = {
        ...storage,
        store: vi.fn().mockRejectedValue(new Error('Storage error')),
      };
      
      const failingSessionManager = new SecureSessionManager(
        mockStorage as any,
        encryption
      );
      
      await expect(failingSessionManager.createSession({}, { userId: 'test' }))
        .rejects.toThrow('Storage error');
      
      failingSessionManager.shutdown();
    });
  });

  describe('cleanup and shutdown', () => {
    it('should force cleanup all sessions', async () => {
      await sessionManager.createSession({}, { userId: 'user1' });
      await sessionManager.createSession({}, { userId: 'user2' });
      
      const metrics = await sessionManager.getMetrics();
      expect(metrics.totalSessions).toBe(2);
      
      await sessionManager.forceCleanup();
      
      const metricsAfter = await sessionManager.getMetrics();
      expect(metricsAfter.totalSessions).toBe(0);
    });

    it('should shutdown cleanly', () => {
      expect(() => sessionManager.shutdown()).not.toThrow();
    });
  });
});