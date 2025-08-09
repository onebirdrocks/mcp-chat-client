import { createCipheriv, createDecipheriv, randomBytes, scrypt, createHash } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
  saltLength: number;
}

export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  saltLength: 32,
};

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  salt: string;
  algorithm: string;
}

export class EncryptionService {
  private config: EncryptionConfig;
  private masterKey?: Buffer;

  constructor(config: EncryptionConfig = DEFAULT_ENCRYPTION_CONFIG) {
    this.config = config;
  }

  /**
   * Initialize the encryption service with a master key
   */
  async initialize(password: string): Promise<void> {
    const salt = randomBytes(this.config.saltLength);
    this.masterKey = (await scryptAsync(password, salt, this.config.keyLength)) as Buffer;
  }

  /**
   * Set master key directly (for testing or when key is already derived)
   */
  setMasterKey(key: Buffer): void {
    if (key.length !== this.config.keyLength) {
      throw new Error(`Master key must be ${this.config.keyLength} bytes long`);
    }
    this.masterKey = key;
  }

  /**
   * Generate a master key from password and salt
   */
  async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return (await scryptAsync(password, salt, this.config.keyLength)) as Buffer;
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  async encrypt(data: string, password?: string): Promise<EncryptedData> {
    if (!data) {
      throw new Error('Data to encrypt cannot be empty');
    }

    const salt = randomBytes(this.config.saltLength);
    const iv = randomBytes(this.config.ivLength);
    
    let key: Buffer;
    if (password) {
      key = await this.deriveKey(password, salt);
    } else if (this.masterKey) {
      key = this.masterKey;
    } else {
      throw new Error('No encryption key available. Initialize with password or set master key.');
    }

    const cipher = createCipheriv(this.config.algorithm, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      salt: salt.toString('hex'),
      algorithm: this.config.algorithm,
    };
  }

  /**
   * Decrypt sensitive data using AES-256-GCM
   */
  async decrypt(encryptedData: EncryptedData, password?: string): Promise<string> {
    if (!encryptedData.encrypted) {
      throw new Error('No encrypted data provided');
    }

    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    
    let key: Buffer;
    if (password) {
      key = await this.deriveKey(password, salt);
    } else if (this.masterKey) {
      key = this.masterKey;
    } else {
      throw new Error('No decryption key available. Provide password or set master key.');
    }

    const decipher = createDecipheriv(encryptedData.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate a secure hash for data integrity checking
   */
  generateHash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify data integrity using hash
   */
  verifyHash(data: string, hash: string): boolean {
    const computedHash = this.generateHash(data);
    return computedHash === hash;
  }

  /**
   * Generate a random encryption key
   */
  generateRandomKey(): Buffer {
    return randomBytes(this.config.keyLength);
  }

  /**
   * Securely clear sensitive data from memory
   */
  clearSensitiveData(): void {
    if (this.masterKey) {
      this.masterKey.fill(0);
      this.masterKey = undefined;
    }
  }
}

// Singleton instance for application-wide use
export const encryptionService = new EncryptionService();

// Utility functions for common encryption tasks
export async function encryptApiKey(apiKey: string, password: string): Promise<EncryptedData> {
  return encryptionService.encrypt(apiKey, password);
}

export async function decryptApiKey(encryptedData: EncryptedData, password: string): Promise<string> {
  return encryptionService.decrypt(encryptedData, password);
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '****';
  }
  return `****${apiKey.slice(-4)}`;
}