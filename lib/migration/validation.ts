// Data validation utilities for migration

import { z } from 'zod';
import { ValidationResult, LegacyChatSession, LegacySettings } from './types';

// Zod schemas for legacy data validation
const LegacyMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'tool', 'system']),
  content: z.string(),
  timestamp: z.union([z.string(), z.date()]),
  toolCalls: z.array(z.any()).optional(),
  toolCallId: z.string().optional(),
});

const LegacyChatSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(LegacyMessageSchema),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  provider: z.string(),
  model: z.string(),
  mcpServers: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  archived: z.boolean().optional(),
  totalTokens: z.number().optional(),
  estimatedCost: z.number().optional(),
});

const LegacySessionsDataSchema = z.object({
  sessions: z.record(z.string(), LegacyChatSessionSchema),
  metadata: z.object({
    lastCleanup: z.string().optional(),
    totalSessions: z.number().optional(),
    version: z.string().optional(),
    encrypted: z.boolean().optional(),
  }).optional(),
});

const LegacyLLMProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  models: z.array(z.object({
    id: z.string(),
    name: z.string(),
    displayName: z.string().optional(),
    supportsToolCalling: z.boolean(),
    maxTokens: z.number().optional(),
    costPer1kTokens: z.object({
      input: z.number(),
      output: z.number(),
    }).optional(),
  })),
  enabled: z.boolean(),
  apiKeyHash: z.string().optional(),
});

const LegacySettingsSchema = z.object({
  llmProviders: z.array(LegacyLLMProviderSchema),
  mcpServers: z.array(z.any()),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    language: z.enum(['en', 'zh']),
    autoScroll: z.boolean(),
    soundEnabled: z.boolean(),
    accessibility: z.object({
      highContrast: z.boolean(),
      reducedMotion: z.boolean(),
      screenReaderAnnouncements: z.boolean(),
      keyboardNavigation: z.boolean(),
      focusVisible: z.boolean(),
      largeText: z.boolean(),
    }).optional(),
  }),
});

/**
 * Validates legacy chat sessions data
 */
export function validateLegacySessionsData(data: any): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    LegacySessionsDataSchema.parse(data);
  } catch (error) {
    result.valid = false;
    if (error instanceof z.ZodError) {
      result.errors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
    } else {
      result.errors.push(`Validation error: ${error}`);
    }
  }

  // Additional validation checks
  if (data.sessions) {
    const sessionIds = Object.keys(data.sessions);
    const duplicateIds = sessionIds.filter((id, index) => sessionIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      result.warnings.push(`Duplicate session IDs found: ${duplicateIds.join(', ')}`);
    }

    // Check for sessions with no messages
    const emptySessions = sessionIds.filter(id => 
      !data.sessions[id].messages || data.sessions[id].messages.length === 0
    );
    if (emptySessions.length > 0) {
      result.warnings.push(`${emptySessions.length} sessions have no messages`);
    }

    // Check for invalid timestamps
    sessionIds.forEach(id => {
      const session = data.sessions[id];
      if (session.createdAt && isNaN(new Date(session.createdAt).getTime())) {
        result.errors.push(`Session ${id} has invalid createdAt timestamp`);
        result.valid = false;
      }
      if (session.updatedAt && isNaN(new Date(session.updatedAt).getTime())) {
        result.errors.push(`Session ${id} has invalid updatedAt timestamp`);
        result.valid = false;
      }
    });
  }

  return result;
}

/**
 * Validates legacy settings data
 */
export function validateLegacySettings(data: any): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    LegacySettingsSchema.parse(data);
  } catch (error) {
    result.valid = false;
    if (error instanceof z.ZodError) {
      result.errors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
    } else {
      result.errors.push(`Validation error: ${error}`);
    }
  }

  // Additional validation checks
  if (data.llmProviders) {
    const providerIds = data.llmProviders.map((p: any) => p.id);
    const duplicateIds = providerIds.filter((id: string, index: number) => 
      providerIds.indexOf(id) !== index
    );
    if (duplicateIds.length > 0) {
      result.warnings.push(`Duplicate provider IDs found: ${duplicateIds.join(', ')}`);
    }

    // Check for providers without API keys
    const providersWithoutKeys = data.llmProviders.filter((p: any) => 
      !p.apiKey || p.apiKey.trim() === ''
    );
    if (providersWithoutKeys.length > 0) {
      result.warnings.push(`${providersWithoutKeys.length} providers have no API keys`);
    }
  }

  return result;
}

/**
 * Validates data integrity by checking checksums
 */
export function validateDataIntegrity(data: any, expectedChecksum?: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!data) {
    result.valid = false;
    result.errors.push('Data is null or undefined');
    return result;
  }

  try {
    // Basic JSON structure validation
    JSON.stringify(data);
  } catch (error) {
    result.valid = false;
    result.errors.push(`Data is not valid JSON: ${error}`);
    return result;
  }

  // If checksum is provided, validate it
  if (expectedChecksum) {
    const crypto = require('crypto');
    const actualChecksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
    
    if (actualChecksum !== expectedChecksum) {
      result.valid = false;
      result.errors.push('Data integrity check failed: checksum mismatch');
    }
  }

  return result;
}

/**
 * Validates that required directories exist and are writable
 */
export async function validateMigrationEnvironment(): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const fs = require('fs').promises;
  const path = require('path');

  const requiredDirs = [
    'data',
    'data/sessions',
    'data/settings',
    'data/backups',
  ];

  for (const dir of requiredDirs) {
    try {
      await fs.access(dir);
    } catch (error) {
      try {
        await fs.mkdir(dir, { recursive: true });
        result.warnings.push(`Created missing directory: ${dir}`);
      } catch (createError) {
        result.valid = false;
        result.errors.push(`Cannot create required directory ${dir}: ${createError}`);
      }
    }
  }

  // Check write permissions
  const testFile = path.join('data', '.migration-test');
  try {
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
  } catch (error) {
    result.valid = false;
    result.errors.push(`No write permission in data directory: ${error}`);
  }

  return result;
}

/**
 * Sanitizes data by removing or masking sensitive information
 */
export function sanitizeDataForValidation(data: any): any {
  if (!data) return data;

  const sanitized = JSON.parse(JSON.stringify(data));

  // Mask API keys in settings
  if (sanitized.llmProviders) {
    sanitized.llmProviders.forEach((provider: any) => {
      if (provider.apiKey) {
        provider.apiKey = '***MASKED***';
      }
    });
  }

  // Remove potentially sensitive message content for validation
  if (sanitized.sessions) {
    Object.values(sanitized.sessions).forEach((session: any) => {
      if (session.messages) {
        session.messages.forEach((message: any) => {
          if (message.content && message.content.length > 1000) {
            message.content = message.content.substring(0, 100) + '...[truncated for validation]';
          }
        });
      }
    });
  }

  return sanitized;
}