import * as CryptoJS from 'crypto-js';
import { InternalServerError } from './errors';

/**
 * Encryption utility for securing sensitive data like API keys
 */
export class EncryptionService {
  private readonly secretKey: string;

  constructor() {
    // Get encryption key from environment or generate a default one
    this.secretKey = process.env.ENCRYPTION_KEY || this.generateDefaultKey();
    
    if (!process.env.ENCRYPTION_KEY) {
      console.warn('ENCRYPTION_KEY not set in environment. Using generated key. This is not secure for production!');
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: string): string {
    try {
      if (!data) return '';
      
      const encrypted = CryptoJS.AES.encrypt(data, this.secretKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new InternalServerError('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    try {
      if (!encryptedData) return '';
      
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        throw new Error('Failed to decrypt data - invalid key or corrupted data');
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new InternalServerError('Failed to decrypt data');
    }
  }

  /**
   * Hash data for secure comparison (one-way)
   */
  hash(data: string): string {
    try {
      return CryptoJS.SHA256(data).toString();
    } catch (error) {
      console.error('Hashing failed:', error);
      throw new InternalServerError('Failed to hash data');
    }
  }

  /**
   * Generate a secure random key
   */
  generateSecureKey(): string {
    return CryptoJS.lib.WordArray.random(256/8).toString();
  }

  /**
   * Mask sensitive data for display (show only last 4 characters with limited mask length)
   */
  maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) {
      return '••••';
    }
    
    const visibleChars = 4;
    const maxMaskLength = 8; // Limit mask length to prevent UI overflow
    const actualMaskLength = Math.min(maxMaskLength, Math.max(0, apiKey.length - visibleChars));
    const maskedPart = '•'.repeat(actualMaskLength);
    const visiblePart = apiKey.slice(-visibleChars);
    
    return maskedPart + visiblePart;
  }

  /**
   * Validate if a string appears to be encrypted
   */
  isEncrypted(data: string): boolean {
    try {
      // Try to decrypt - if it fails, it's likely not encrypted
      this.decrypt(data);
      return true;
    } catch {
      return false;
    }
  }

  private generateDefaultKey(): string {
    // Generate a consistent but unique key based on system info
    // This is NOT secure for production - should use proper environment variable
    const systemInfo = process.platform + process.arch + (process.env.HOME || process.env.USERPROFILE || 'default');
    return CryptoJS.SHA256(systemInfo + 'mcp-chat-ui-default-key').toString();
  }
}

// Singleton instance
let encryptionService: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    encryptionService = new EncryptionService();
  }
  return encryptionService;
}