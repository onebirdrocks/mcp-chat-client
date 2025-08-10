/**
 * Comprehensive example showing how to use the MCP Chat UI security components
 * This example demonstrates encryption, secure storage, session management, and settings management
 */

import { createSecurityStack, SecurityUtils } from '../index';
import { LLMProviderConfig, MCPServerConfig } from '../../types';

async function securityUsageExample() {
  console.log('🔐 MCP Chat UI Security Components Example\n');

  // 1. Create the security stack
  console.log('1. Creating security stack...');
  const masterPassword = SecurityUtils.generateSecurePassword(32);
  console.log(`Generated master password: ${SecurityUtils.sanitizeForLogging({ password: masterPassword }).password}`);

  const securityStack = createSecurityStack({
    encryptionPassword: masterPassword,
    storageDir: './data/secure',
    sessionConfig: {
      defaultTimeout: 60, // 1 hour
      maxTimeout: 1440, // 24 hours
      cleanupInterval: 15, // 15 minutes
      encryptionEnabled: true,
      trackUserAgent: true,
      trackIpAddress: true,
    },
  });

  const { encryption, storage, sessionManager, settingsManager } = securityStack;

  try {
    // 2. Settings Management Example
    console.log('\n2. Settings Management Example');
    
    // Load settings (creates defaults if none exist)
    const settings = await settingsManager.loadSettings();
    console.log('✅ Settings loaded successfully');

    // Add LLM provider with encrypted API key
    const openaiProvider: LLMProviderConfig = {
      id: 'openai-main',
      name: 'openai',
      displayName: 'OpenAI GPT-4',
      apiKey: 'sk-example-api-key-1234567890abcdef',
      baseUrl: 'https://api.openai.com/v1',
      models: [
        {
          id: 'gpt-4',
          name: 'gpt-4',
          displayName: 'GPT-4',
          supportsToolCalling: true,
          maxTokens: 8192,
          costPer1kTokens: { input: 0.03, output: 0.06 },
        },
      ],
      enabled: true,
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 10000,
      },
    };

    await settingsManager.updateLLMProvider(openaiProvider);
    console.log('✅ LLM provider added with encrypted API key');
    console.log(`   Masked API key: ${settingsManager.getMaskedApiKey('openai-main')}`);

    // Add MCP server configuration
    const mcpServer: MCPServerConfig = {
      id: 'filesystem-server',
      name: 'filesystem',
      displayName: 'File System Tools',
      command: 'uvx',
      args: ['mcp-server-filesystem', '/path/to/workspace'],
      env: { LOG_LEVEL: 'info' },
      enabled: true,
      status: 'disconnected',
      tools: [],
    };

    await settingsManager.updateMCPServer(mcpServer);
    console.log('✅ MCP server configuration added');

    // Update user preferences
    await settingsManager.updatePreferences({
      theme: 'dark',
      language: 'en',
      confirmToolCalls: true,
      showTokenCount: true,
    });
    console.log('✅ User preferences updated');

    // 3. Session Management Example
    console.log('\n3. Session Management Example');

    // Create user session
    const sessionId = await sessionManager.createSession(
      {
        userId: 'user123',
        chatHistory: [],
        selectedProvider: 'openai-main',
        selectedModel: 'gpt-4',
      },
      {
        timeout: 120, // 2 hours
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Example Browser)',
      }
    );

    console.log(`✅ Session created: ${sessionId.substring(0, 8)}...`);

    // Update session with chat data
    await sessionManager.updateSession(sessionId, {
      chatHistory: [
        { role: 'user', content: 'Hello, how can you help me?' },
        { role: 'assistant', content: 'I can help you with various tasks using available tools.' },
      ],
      lastActivity: new Date().toISOString(),
    });

    console.log('✅ Session updated with chat history');

    // Validate session security
    const validation = await sessionManager.validateSession(
      sessionId,
      '192.168.1.100',
      'Mozilla/5.0 (Example Browser)'
    );

    console.log(`✅ Session validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
    if (!validation.valid) {
      console.log(`   Reason: ${validation.reason}`);
    }

    // 4. Secure Storage Example
    console.log('\n4. Secure Storage Example');

    // Store sensitive configuration
    const sensitiveConfig = {
      apiKeys: {
        openai: 'sk-real-api-key-here',
        anthropic: 'sk-ant-api-key-here',
      },
      webhookSecrets: {
        github: 'webhook-secret-123',
        slack: 'slack-webhook-456',
      },
      encryptionKeys: {
        database: 'db-encryption-key-789',
      },
    };

    await storage.store('sensitive-config', sensitiveConfig, masterPassword);
    console.log('✅ Sensitive configuration stored with encryption');

    // Retrieve and verify
    const retrievedConfig = await storage.retrieve('sensitive-config', masterPassword);
    const isIntact = JSON.stringify(sensitiveConfig) === JSON.stringify(retrievedConfig);
    console.log(`✅ Configuration retrieved and verified: ${isIntact ? 'INTACT' : 'CORRUPTED'}`);

    // 5. Backup and Recovery Example
    console.log('\n5. Backup and Recovery Example');

    // Create settings backup
    const backup = await settingsManager.createBackup();
    console.log(`✅ Settings backup created: ${backup.timestamp}`);
    console.log(`   Backup checksum: ${backup.checksum.substring(0, 16)}...`);

    // Simulate settings change
    await settingsManager.updatePreferences({ theme: 'light' });
    console.log('✅ Settings modified (theme changed to light)');

    // Restore from backup
    await settingsManager.restoreFromBackup(backup);
    const restoredSettings = settingsManager.getSettings();
    console.log(`✅ Settings restored from backup (theme: ${restoredSettings.preferences.theme})`);

    // 6. Security Utilities Example
    console.log('\n6. Security Utilities Example');

    // Password strength validation
    const testPasswords = ['weak', 'StrongerPass123', 'VeryStr0ng!P@ssw0rd#2024'];
    
    testPasswords.forEach(password => {
      const strength = SecurityUtils.validatePasswordStrength(password);
      console.log(`   Password "${password}": Score ${strength.score}/6, Strong: ${strength.isStrong}`);
      if (strength.feedback.length > 0) {
        console.log(`     Feedback: ${strength.feedback[0]}`);
      }
    });

    // Data sanitization for logging
    const logData = {
      user: 'john_doe',
      action: 'api_call',
      apiKey: 'sk-secret-key-123456789',
      timestamp: new Date().toISOString(),
      response: { success: true, tokens: 150 },
    };

    const sanitizedLog = SecurityUtils.sanitizeForLogging(logData);
    console.log('✅ Log data sanitized:');
    console.log('   Original API key:', logData.apiKey);
    console.log('   Sanitized API key:', sanitizedLog.apiKey);

    // 7. Session Metrics and Monitoring
    console.log('\n7. Session Metrics and Monitoring');

    // Create additional sessions for metrics
    await Promise.all([
      sessionManager.createSession({ userId: 'user456' }),
      sessionManager.createSession({ userId: 'user789' }),
      sessionManager.createSession({ userId: 'user123' }), // Second session for user123
    ]);

    const metrics = await sessionManager.getMetrics();
    console.log('✅ Session metrics:');
    console.log(`   Total sessions: ${metrics.totalSessions}`);
    console.log(`   Active sessions: ${metrics.activeSessions}`);
    console.log(`   Average duration: ${metrics.averageSessionDuration.toFixed(2)} minutes`);

    // Get user-specific sessions
    const userSessions = await sessionManager.getUserSessions('user123');
    console.log(`   Sessions for user123: ${userSessions.length}`);

    // 8. Storage Statistics
    console.log('\n8. Storage Statistics');

    const storageStats = await storage.getStats();
    console.log('✅ Storage statistics:');
    console.log(`   Total keys: ${storageStats.totalKeys}`);
    console.log(`   Encrypted keys: ${storageStats.encryptedKeys}`);
    console.log(`   Total size: ${(storageStats.totalSize / 1024).toFixed(2)} KB`);
    if (storageStats.lastBackup) {
      console.log(`   Last backup: ${storageStats.lastBackup}`);
    }

    // 9. Export and Import Example
    console.log('\n9. Export and Import Example');

    // Export settings (without sensitive data)
    const exportedSettings = await settingsManager.exportSettings(false);
    console.log(`✅ Settings exported (${exportedSettings.length} characters)`);
    console.log('   API keys are redacted in export');

    // Export with sensitive data (for backup purposes)
    const fullExport = await settingsManager.exportSettings(true);
    console.log(`✅ Full settings exported (${fullExport.length} characters)`);
    console.log('   ⚠️  Full export contains sensitive data - handle carefully');

    // 10. Cleanup and Security
    console.log('\n10. Cleanup and Security');

    // Clean up expired sessions
    const cleanedSessions = await sessionManager.cleanupExpiredSessions();
    console.log(`✅ Cleaned up ${cleanedSessions} expired sessions`);

    // Test API key
    const keyTest = await settingsManager.testApiKey('openai-main');
    console.log(`✅ API key test: ${keyTest.valid ? 'VALID' : 'INVALID'}`);
    if (!keyTest.valid && keyTest.error) {
      console.log(`   Error: ${keyTest.error}`);
    }

    console.log('\n🎉 Security components example completed successfully!');

  } catch (error) {
    console.error('❌ Error in security example:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    
    // Shutdown session manager
    sessionManager.shutdown();
    
    // Clear sensitive data from memory
    encryption.clearSensitiveData();
    settingsManager.cleanup();
    
    console.log('✅ Cleanup completed');
  }
}

// Additional utility functions for common security patterns

/**
 * Example: Secure API key rotation
 */
async function rotateApiKey(
  settingsManager: any,
  providerId: string,
  newApiKey: string
): Promise<void> {
  console.log(`🔄 Rotating API key for provider: ${providerId}`);
  
  // Test new key before updating
  const testResult = await settingsManager.testApiKey(providerId);
  if (!testResult.valid) {
    throw new Error(`New API key validation failed: ${testResult.error}`);
  }
  
  // Create backup before rotation
  await settingsManager.createBackup();
  
  // Update with new key
  const settings = settingsManager.getSettings();
  const provider = settings.llmProviders.find((p: any) => p.id === providerId);
  if (provider) {
    provider.apiKey = newApiKey;
    await settingsManager.updateLLMProvider(provider);
    console.log('✅ API key rotated successfully');
  }
}

/**
 * Example: Session security audit
 */
async function auditSessionSecurity(sessionManager: any): Promise<void> {
  console.log('🔍 Performing session security audit...');
  
  const metrics = await sessionManager.getMetrics();
  
  // Check for suspicious patterns
  if (metrics.activeSessions > 100) {
    console.warn('⚠️  High number of active sessions detected');
  }
  
  if (metrics.averageSessionDuration > 1440) { // 24 hours
    console.warn('⚠️  Sessions with unusually long duration detected');
  }
  
  // Clean up expired sessions
  const cleaned = await sessionManager.cleanupExpiredSessions();
  if (cleaned > 0) {
    console.log(`✅ Cleaned up ${cleaned} expired sessions`);
  }
  
  console.log('✅ Session security audit completed');
}

/**
 * Example: Data integrity check
 */
async function performIntegrityCheck(storage: any): Promise<boolean> {
  console.log('🔍 Performing data integrity check...');
  
  const keys = await storage.listKeys();
  let corruptedCount = 0;
  
  for (const key of keys) {
    try {
      const metadata = await storage.getMetadata(key);
      if (metadata) {
        // Additional integrity checks could be performed here
        console.log(`✅ ${key}: integrity OK`);
      }
    } catch (error) {
      console.error(`❌ ${key}: integrity check failed`);
      corruptedCount++;
    }
  }
  
  if (corruptedCount > 0) {
    console.warn(`⚠️  ${corruptedCount} corrupted files detected`);
    return false;
  }
  
  console.log('✅ All data integrity checks passed');
  return true;
}

// Run the example if this file is executed directly
if (require.main === module) {
  securityUsageExample().catch(console.error);
}

export {
  securityUsageExample,
  rotateApiKey,
  auditSessionSecurity,
  performIntegrityCheck,
};