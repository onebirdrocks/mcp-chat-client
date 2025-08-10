import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { createSecurityStack, SecurityUtils } from '../index';
import { LLMProviderConfig } from '../../types';

describe('Security Integration Tests', () => {
  const testDir = 'test-security-integration';
  const testPassword = 'integration-test-password-123';
  let securityStack: ReturnType<typeof createSecurityStack>;

  beforeEach(async () => {
    securityStack = await createSecurityStack({
      encryptionPassword: testPassword,
      storageDir: testDir,
      sessionConfig: {
        defaultTimeout: 30,
        cleanupInterval: 1,
      },
    });
  });

  afterEach(async () => {
    securityStack.sessionManager.shutdown();
    securityStack.encryption.clearSensitiveData();
    securityStack.settingsManager.cleanup();
    
    // Clean up test directory
    try {
      await fs.rmdir(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('complete workflow integration', () => {
    it('should handle complete user workflow with encryption', async () => {
      const { encryption, storage, sessionManager, settingsManager } = securityStack;

      // 1. Load settings (creates defaults)
      const settings = await settingsManager.loadSettings();
      expect(settings).toBeDefined();

      // 2. Add LLM provider with API key
      const provider: LLMProviderConfig = {
        id: 'openai-integration',
        name: 'openai',
        displayName: 'OpenAI Integration Test',
        apiKey: 'sk-integration-test-key-123456789',
        models: [],
        enabled: true,
        rateLimits: { requestsPerMinute: 60, tokensPerMinute: 10000 },
      };

      await settingsManager.updateLLMProvider(provider);

      // 3. Create user session
      const sessionId = await sessionManager.createSession(
        { preferences: { theme: 'dark' } },
        { userId: 'integration-user', ipAddress: '127.0.0.1', userAgent: 'Integration Test Browser' }
      );

      // 4. Verify session exists and is valid
      const session = await sessionManager.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session!.userId).toBe('integration-user');

      // 5. Update session data
      await sessionManager.updateSession(sessionId, { 
        chatHistory: ['Hello', 'Hi there!'],
        lastActivity: new Date().toISOString(),
      });

      // 6. Verify settings are encrypted in storage
      const rawSettingsData = await storage.retrieve('app_settings', testPassword);
      expect(rawSettingsData).toBeDefined();

      // 7. Verify API key is masked for display
      const maskedKey = settingsManager.getMaskedApiKey('openai-integration');
      expect(maskedKey).toBe('****6789');

      // 8. Create backup
      const backup = await settingsManager.createBackup();
      expect(backup.checksum).toBeDefined();

      // 9. Clean up session
      await sessionManager.destroySession(sessionId);
      const destroyedSession = await sessionManager.getSession(sessionId);
      expect(destroyedSession).toBeNull();
    });

    it('should maintain data integrity across operations', async () => {
      const { settingsManager, sessionManager } = securityStack;

      // Load settings and add provider
      await settingsManager.loadSettings();
      const provider: LLMProviderConfig = {
        id: 'integrity-test',
        name: 'openai',
        displayName: 'Integrity Test',
        apiKey: 'sk-integrity-test-key-987654321',
        models: [],
        enabled: true,
        rateLimits: { requestsPerMinute: 60, tokensPerMinute: 10000 },
      };

      await settingsManager.updateLLMProvider(provider);

      // Create multiple sessions
      const sessionIds = await Promise.all([
        sessionManager.createSession({ data: 'session1' }, { userId: 'user1' }),
        sessionManager.createSession({ data: 'session2' }, { userId: 'user2' }),
        sessionManager.createSession({ data: 'session3' }, { userId: 'user1' }),
      ]);

      // Verify all sessions exist
      for (const sessionId of sessionIds) {
        const session = await sessionManager.getSession(sessionId);
        expect(session).toBeDefined();
      }

      // Update settings
      await settingsManager.updatePreferences({ theme: 'dark', language: 'zh' });

      // Verify settings persist
      const updatedSettings = settingsManager.getSettings();
      expect(updatedSettings.preferences.theme).toBe('dark');
      expect(updatedSettings.preferences.language).toBe('zh');

      // Verify provider still exists
      expect(updatedSettings.llmProviders).toHaveLength(1);
      expect(updatedSettings.llmProviders[0].id).toBe('integrity-test');

      // Clean up user sessions
      const destroyedCount = await sessionManager.destroyUserSessions('user1');
      expect(destroyedCount).toBe(2);

      // Verify only user2 session remains
      const remainingSessions = await sessionManager.getUserSessions('user2');
      expect(remainingSessions).toHaveLength(1);
    });

    it('should handle encryption/decryption errors gracefully', async () => {
      const { encryption, storage } = securityStack;

      // Store data with one password
      const testData = { sensitive: 'information' };
      await storage.store('test-key', testData, testPassword);

      // Try to retrieve with wrong password
      await expect(storage.retrieve('test-key', 'wrong-password'))
        .rejects.toThrow();

      // Verify correct password still works
      const retrieved = await storage.retrieve('test-key', testPassword);
      expect(retrieved).toEqual(testData);
    });

    it('should handle concurrent operations safely', async () => {
      const { sessionManager, settingsManager } = securityStack;

      await settingsManager.loadSettings();

      // Create multiple concurrent sessions
      const sessionPromises = Array.from({ length: 10 }, (_, i) =>
        sessionManager.createSession({ index: i }, { userId: `user${i}` })
      );

      const sessionIds = await Promise.all(sessionPromises);
      expect(sessionIds).toHaveLength(10);

      // Verify all sessions are unique
      const uniqueIds = new Set(sessionIds);
      expect(uniqueIds.size).toBe(10);

      // Concurrent updates
      const updatePromises = sessionIds.map((sessionId, i) =>
        sessionManager.updateSession(sessionId, { updated: true, step: i })
      );

      const updateResults = await Promise.all(updatePromises);
      expect(updateResults.every(result => result === true)).toBe(true);

      // Verify all sessions were updated
      for (const sessionId of sessionIds) {
        const session = await sessionManager.getSession(sessionId);
        expect(session!.data.updated).toBe(true);
      }
    });
  });

  describe('security utilities integration', () => {
    it('should generate secure passwords', () => {
      const password1 = SecurityUtils.generateSecurePassword(16);
      const password2 = SecurityUtils.generateSecurePassword(16);
      
      expect(password1).toHaveLength(16);
      expect(password2).toHaveLength(16);
      expect(password1).not.toBe(password2);
      
      const validation = SecurityUtils.validatePasswordStrength(password1);
      expect(validation.isStrong).toBe(true);
    });

    it('should sanitize sensitive data for logging', () => {
      const sensitiveData = {
        username: 'testuser',
        password: 'secret123',
        apiKey: 'sk-secret-key-123',
        publicInfo: 'this is safe',
        nested: {
          token: 'secret-token',
          safeData: 'also safe',
        },
      };

      const sanitized = SecurityUtils.sanitizeForLogging(sensitiveData);
      
      expect(sanitized.username).toBe('testuser');
      expect(sanitized.password).toBe('****t123');
      expect(sanitized.apiKey).toBe('****-123');
      expect(sanitized.publicInfo).toBe('this is safe');
      expect(sanitized.nested.token).toBe('****oken');
      expect(sanitized.nested.safeData).toBe('also safe');
    });

    it('should create and verify integrity hashes', () => {
      const data = 'important data that needs integrity checking';
      const hash = SecurityUtils.createIntegrityHash(data);
      
      expect(hash).toHaveLength(64); // SHA-256 hex length
      expect(SecurityUtils.verifyIntegrity(data, hash)).toBe(true);
      expect(SecurityUtils.verifyIntegrity(data + ' modified', hash)).toBe(false);
    });
  });

  describe('error recovery and resilience', () => {
    it('should recover from corrupted session data', async () => {
      const { sessionManager, storage } = securityStack;

      // Create a valid session
      const sessionId = await sessionManager.createSession({}, { userId: 'test-user' });
      expect(await sessionManager.getSession(sessionId)).toBeDefined();

      // Corrupt the session data in storage by storing invalid data
      await storage.store(`session_${sessionId}`, { corrupted: 'data' });

      // Force cleanup to clear memory cache
      await sessionManager.forceCleanup();

      // Session should be cleaned up and return null due to corruption
      const corruptedSession = await sessionManager.getSession(sessionId);
      expect(corruptedSession).toBeNull();
    });

    it('should handle storage failures gracefully', async () => {
      const { settingsManager } = securityStack;

      // Load settings successfully
      await settingsManager.loadSettings();

      // Simulate storage failure by using wrong password
      const failingManager = new (settingsManager.constructor as any)(
        securityStack.storage,
        securityStack.encryption,
        'wrong-password'
      );

      // Should fall back to defaults when loading fails
      const settings = await failingManager.loadSettings();
      expect(settings).toBeDefined();
      expect(settings.version).toBe('1.0.0');
      
      failingManager.cleanup();
    });

    it('should maintain consistency during partial failures', async () => {
      const { sessionManager, settingsManager } = securityStack;

      await settingsManager.loadSettings();

      // Create sessions
      const sessionId1 = await sessionManager.createSession({ userId: 'user1' });
      const sessionId2 = await sessionManager.createSession({ userId: 'user2' });

      // Verify both exist
      expect(await sessionManager.getSession(sessionId1)).toBeDefined();
      expect(await sessionManager.getSession(sessionId2)).toBeDefined();

      // Destroy one session
      await sessionManager.destroySession(sessionId1);

      // Verify only one is destroyed
      expect(await sessionManager.getSession(sessionId1)).toBeNull();
      expect(await sessionManager.getSession(sessionId2)).toBeDefined();
    });
  });

  describe('performance and scalability', () => {
    it('should handle large amounts of data efficiently', async () => {
      const { storage } = securityStack;

      const largeData = {
        messages: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          content: `Message ${i}`.repeat(100), // ~1KB per message
          timestamp: new Date().toISOString(),
        })),
        metadata: {
          totalSize: '~1MB',
          created: new Date().toISOString(),
        },
      };

      const startTime = Date.now();
      await storage.store('large-data', largeData, testPassword);
      const storeTime = Date.now() - startTime;

      const retrieveStartTime = Date.now();
      const retrieved = await storage.retrieve('large-data', testPassword);
      const retrieveTime = Date.now() - retrieveStartTime;

      expect(retrieved).toEqual(largeData);
      expect(storeTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(retrieveTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle many concurrent sessions', async () => {
      const { sessionManager } = securityStack;

      const sessionCount = 100;
      const startTime = Date.now();

      // Create many sessions concurrently
      const sessionPromises = Array.from({ length: sessionCount }, (_, i) =>
        sessionManager.createSession({ index: i }, { userId: `user${i % 10}` })
      );

      const sessionIds = await Promise.all(sessionPromises);
      const createTime = Date.now() - startTime;

      expect(sessionIds).toHaveLength(sessionCount);
      expect(createTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all sessions exist
      const retrieveStartTime = Date.now();
      const sessions = await Promise.all(
        sessionIds.map(id => sessionManager.getSession(id))
      );
      const retrieveTime = Date.now() - retrieveStartTime;

      expect(sessions.every(s => s !== null)).toBe(true);
      expect(retrieveTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Clean up
      await sessionManager.forceCleanup();
    });
  });
});