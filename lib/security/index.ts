// Encryption utilities
export {
  EncryptionService,
  encryptionService,
  encryptApiKey,
  decryptApiKey,
  maskApiKey,
  DEFAULT_ENCRYPTION_CONFIG,
  type EncryptionConfig,
  type EncryptedData,
} from './encryption';

// Secure storage
export {
  SecureStorage,
  type StorageMetadata,
  type SecureStorageOptions,
  type StoredData,
} from './secure-storage';

// Session management
export {
  SecureSessionManager,
  type SessionData,
  type SessionConfig,
  type SessionMetrics,
} from './session-manager';

// Settings management
export {
  SecureSettingsManager,
  type SecureSettings,
  type SettingsBackup,
  type SettingsValidationResult,
} from './secure-settings-manager';

// Utility functions for common security operations
import { EncryptionService } from './encryption';
import { SecureStorage } from './secure-storage';
import { SecureSessionManager } from './session-manager';
import { SecureSettingsManager } from './secure-settings-manager';

/**
 * Create a configured security stack
 */
export async function createSecurityStack(options: {
  encryptionPassword: string;
  storageDir?: string;
  sessionConfig?: Partial<import('./session-manager').SessionConfig>;
}) {
  const encryption = new EncryptionService();
  await encryption.initialize(options.encryptionPassword);

  const storage = new SecureStorage(encryption, {
    baseDir: options.storageDir || process.cwd() + '/data/secure',
    encryptionEnabled: true,
    backupEnabled: true,
  });

  const sessionManager = new SecureSessionManager(
    storage,
    encryption,
    options.sessionConfig
  );

  const settingsManager = new SecureSettingsManager(
    storage,
    encryption,
    options.encryptionPassword
  );

  return {
    encryption,
    storage,
    sessionManager,
    settingsManager,
  };
}

/**
 * Security utilities for common operations
 */
export const SecurityUtils = {
  /**
   * Generate a secure random password
   */
  generateSecurePassword(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    const crypto = require('crypto');
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      result += chars[randomIndex];
    }
    
    return result;
  },

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    if (password.length >= 12) score += 1;
    else feedback.push('Password should be at least 12 characters for better security');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Password should contain lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Password should contain uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Password should contain numbers');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    else feedback.push('Password should contain special characters');

    return {
      score,
      feedback,
      isStrong: score >= 4,
    };
  },

  /**
   * Sanitize sensitive data for logging
   */
  sanitizeForLogging(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'password', 'apiKey', 'token', 'secret', 'key', 'auth',
      'authorization', 'credential', 'private'
    ];

    const sanitized = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitiveKey => 
        keyLower.includes(sensitiveKey)
      );

      if (isSensitive && typeof value === 'string') {
        (sanitized as any)[key] = value.length > 4 ? `****${value.slice(-4)}` : '****';
      } else if (typeof value === 'object' && value !== null) {
        (sanitized as any)[key] = SecurityUtils.sanitizeForLogging(value);
      } else {
        (sanitized as any)[key] = value;
      }
    }

    return sanitized;
  },

  /**
   * Create a secure hash for data integrity
   */
  createIntegrityHash(data: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  },

  /**
   * Verify data integrity
   */
  verifyIntegrity(data: string, hash: string): boolean {
    const computedHash = SecurityUtils.createIntegrityHash(data);
    return computedHash === hash;
  },
};