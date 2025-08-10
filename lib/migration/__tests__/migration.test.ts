// Tests for migration utilities

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { 
  validateLegacySessionsData, 
  validateLegacySettings,
  transformChatSession,
  transformSettings,
  MigrationRunner,
  migrationSteps
} from '../index';

// Mock fs operations
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      access: vi.fn(),
      readdir: vi.fn(),
      stat: vi.fn(),
      unlink: vi.fn(),
    },
  };
});

const mockFs = fs as any;

describe('Migration Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateLegacySessionsData', () => {
    it('should validate correct legacy sessions data', () => {
      const validData = {
        sessions: {
          'session-1': {
            id: 'session-1',
            title: 'Test Session',
            messages: [
              {
                id: 'msg-1',
                role: 'user',
                content: 'Hello',
                timestamp: '2025-01-08T10:00:00.000Z',
              },
            ],
            createdAt: '2025-01-08T10:00:00.000Z',
            updatedAt: '2025-01-08T10:00:00.000Z',
            provider: 'openai',
            model: 'gpt-4',
          },
        },
        metadata: {
          totalSessions: 1,
          version: '1.0.0',
        },
      };

      const result = validateLegacySessionsData(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid sessions data', () => {
      const invalidData = {
        sessions: {
          'session-1': {
            id: 'session-1',
            // Missing required fields
            messages: [],
          },
        },
      };

      const result = validateLegacySessionsData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about empty sessions', () => {
      const dataWithEmptySessions = {
        sessions: {
          'session-1': {
            id: 'session-1',
            title: 'Empty Session',
            messages: [],
            createdAt: '2025-01-08T10:00:00.000Z',
            updatedAt: '2025-01-08T10:00:00.000Z',
            provider: 'openai',
            model: 'gpt-4',
          },
        },
      };

      const result = validateLegacySessionsData(dataWithEmptySessions);
      expect(result.warnings.some(w => w.includes('no messages'))).toBe(true);
    });
  });

  describe('validateLegacySettings', () => {
    it('should validate correct legacy settings', () => {
      const validSettings = {
        llmProviders: [
          {
            id: 'openai-1',
            name: 'openai',
            apiKey: 'sk-test',
            models: [
              {
                id: 'gpt-4',
                name: 'GPT-4',
                supportsToolCalling: true,
              },
            ],
            enabled: true,
          },
        ],
        mcpServers: [],
        preferences: {
          theme: 'dark',
          language: 'en',
          autoScroll: true,
          soundEnabled: false,
        },
      };

      const result = validateLegacySettings(validSettings);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid settings', () => {
      const invalidSettings = {
        llmProviders: [
          {
            // Missing required fields
            name: 'openai',
          },
        ],
        preferences: {
          theme: 'invalid-theme', // Invalid enum value
        },
      };

      const result = validateLegacySettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Data Transformation', () => {
  describe('transformChatSession', () => {
    it('should transform legacy session to new format', () => {
      const legacySession = {
        id: 'session-1',
        title: 'Test Session',
        messages: [
          {
            id: 'msg-1',
            role: 'user' as const,
            content: 'Hello',
            timestamp: '2025-01-08T10:00:00.000Z',
          },
        ],
        createdAt: '2025-01-08T10:00:00.000Z',
        updatedAt: '2025-01-08T10:00:00.000Z',
        provider: 'openai',
        model: 'gpt-4',
        mcpServers: ['server-1'],
        totalTokens: 100,
        estimatedCost: 0.01,
      };

      const transformed = transformChatSession(legacySession);

      expect(transformed.id).toBe(legacySession.id);
      expect(transformed.title).toBe(legacySession.title);
      expect(transformed.provider).toBe(legacySession.provider);
      expect(transformed.model).toBe(legacySession.model);
      expect(transformed.mcpServers).toEqual(legacySession.mcpServers);
      expect(transformed.totalTokens).toBe(legacySession.totalTokens);
      expect(transformed.estimatedCost).toBe(legacySession.estimatedCost);
      
      // Check date conversion
      expect(transformed.createdAt).toBeInstanceOf(Date);
      expect(transformed.updatedAt).toBeInstanceOf(Date);
      
      // Check messages transformation
      expect(transformed.messages).toHaveLength(1);
      expect(transformed.messages[0].id).toBe('msg-1');
      expect(transformed.messages[0].metadata).toBeDefined();
    });

    it('should handle sessions with tool calls', () => {
      const legacySession = {
        id: 'session-1',
        title: 'Test Session',
        messages: [
          {
            id: 'msg-1',
            role: 'assistant' as const,
            content: 'I need to use a tool',
            timestamp: '2025-01-08T10:00:00.000Z',
            toolCalls: [
              {
                id: 'tool-1',
                type: 'function' as const,
                function: {
                  name: 'test-tool',
                  arguments: '{"param": "value"}',
                },
                serverId: 'server-1',
                approved: true,
                result: 'success',
              },
            ],
          },
        ],
        createdAt: '2025-01-08T10:00:00.000Z',
        updatedAt: '2025-01-08T10:00:00.000Z',
        provider: 'openai',
        model: 'gpt-4',
      };

      const transformed = transformChatSession(legacySession);
      
      expect(transformed.messages[0].toolCalls).toHaveLength(1);
      expect(transformed.messages[0].toolCalls![0].serverId).toBe('server-1');
      expect(transformed.messages[0].toolCalls![0].status).toBeDefined();
    });
  });

  describe('transformSettings', () => {
    it('should transform legacy settings to new format', () => {
      const legacySettings = {
        llmProviders: [
          {
            id: 'openai-1',
            name: 'openai',
            apiKey: 'encrypted-key',
            models: [
              {
                id: 'gpt-4',
                name: 'GPT-4',
                supportsToolCalling: true,
                maxTokens: 8192,
              },
            ],
            enabled: true,
          },
        ],
        mcpServers: [
          {
            id: 'server-1',
            name: 'Test Server',
            command: 'node',
            args: ['server.js'],
            enabled: true,
          },
        ],
        preferences: {
          theme: 'dark' as const,
          language: 'en' as const,
          autoScroll: true,
          soundEnabled: false,
          accessibility: {
            highContrast: false,
            reducedMotion: false,
            screenReaderAnnouncements: true,
            keyboardNavigation: true,
            focusVisible: true,
            largeText: false,
          },
        },
      };

      const transformed = transformSettings(legacySettings);

      expect(transformed.llmProviders).toHaveLength(1);
      expect(transformed.llmProviders[0].id).toBe('openai-1');
      expect(transformed.llmProviders[0].models[0].displayName).toBe('GPT-4');

      expect(transformed.mcpServers).toHaveLength(1);
      expect(transformed.mcpServers[0].id).toBe('server-1');

      expect(transformed.preferences.theme).toBe('dark');
      expect(transformed.preferences.accessibility).toBeDefined();
    });
  });
});

describe('MigrationRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create migration plan', async () => {
    const runner = new MigrationRunner();
    const plan = await runner.createPlan();

    expect(plan.steps).toHaveLength(migrationSteps.length);
    expect(plan.totalSteps).toBe(migrationSteps.length);
    expect(plan.estimatedDuration).toBeGreaterThan(0);
    expect(plan.requiredBackupSpace).toBeGreaterThan(0);
  });

  it('should handle dry run mode', async () => {
    // Mock successful file operations
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{}');

    const runner = new MigrationRunner(migrationSteps, { dryRun: true });
    const result = await runner.execute();

    // In dry run mode, no actual file operations should occur
    expect(result.success).toBe(true);
    expect(result.warnings.some(w => w.includes('Dry run'))).toBe(true);
  });

  it('should handle cancellation', async () => {
    const runner = new MigrationRunner();
    
    // Cancel immediately
    runner.cancel();
    
    const result = await runner.execute();
    expect(result.errors.some(e => e.includes('cancelled'))).toBe(true);
  });

  it('should track progress correctly', async () => {
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{}');

    const runner = new MigrationRunner();
    const progressUpdates: any[] = [];

    await runner.execute((progress) => {
      progressUpdates.push({ ...progress });
    });

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[0].currentStep).toBe(1);
    expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle file system errors gracefully', async () => {
    mockFs.access.mockRejectedValue(new Error('Permission denied'));
    
    const runner = new MigrationRunner();
    const result = await runner.execute();

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle invalid JSON data', () => {
    const invalidJson = 'not valid json';
    
    expect(() => {
      JSON.parse(invalidJson);
    }).toThrow();

    // Validation should catch this
    const result = validateLegacySessionsData(null);
    expect(result.valid).toBe(false);
  });

  it('should handle missing required directories', async () => {
    mockFs.access.mockRejectedValue(new Error('ENOENT'));
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);

    const runner = new MigrationRunner();
    const result = await runner.execute();

    // Should create missing directories and continue
    expect(mockFs.mkdir).toHaveBeenCalled();
  });
});