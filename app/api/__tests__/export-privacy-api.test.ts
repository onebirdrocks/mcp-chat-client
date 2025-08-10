import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as exportChatHistory, GET as getChatHistoryInfo } from '../export/chat-history/route';
import { POST as privacyCleanup, GET as getPrivacyReport } from '../privacy/cleanup/route';
import { POST as exportSettings, PUT as importSettings, GET as getSettingsInfo } from '../export/settings/route';

// Mock file system operations
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFile: vi.fn(),
    readdir: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    access: vi.fn(),
  };
});

// Mock path module
vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    join: vi.fn((...args) => args.join('/')),
  };
});

// Mock SecureSettingsManager
vi.mock('../../../../backend/src/services/SecureSettingsManager', () => ({
  getSecureSettingsManager: vi.fn(() => ({
    initialize: vi.fn(),
    exportSettings: vi.fn(() => ({
      version: '1.0.0',
      exportDate: '2024-01-01T00:00:00.000Z',
      settings: {
        preferences: { theme: 'dark', language: 'en' },
        mcpServers: []
      }
    })),
    importSettings: vi.fn(),
    clearSensitiveData: vi.fn(),
    getStatistics: vi.fn(() => ({
      totalProviders: 2,
      providersWithKeys: 1,
      totalMcpServers: 1,
      enabledMcpServers: 1,
      lastUpdated: '2024-01-01T00:00:00.000Z'
    }))
  }))
}));

describe('Export and Privacy APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Chat History Export API', () => {
    it('should export chat history in JSON format', async () => {
      const { readdir, readFile, access } = await import('fs/promises');
      
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readdir).mockResolvedValue(['session1.json', 'session2.json'] as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        id: 'session1',
        title: 'Test Session',
        messages: [
          {
            id: 'msg1',
            role: 'user',
            content: 'Hello',
            timestamp: '2024-01-01T00:00:00.000Z'
          }
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        provider: 'openai',
        model: 'gpt-4'
      }));

      const request = new NextRequest('http://localhost/api/export/chat-history', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          includeSensitiveData: false
        })
      });

      const response = await exportChatHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.contentType).toBe('application/json');
      expect(data.data.sessionCount).toBeGreaterThan(0);
    });

    it('should export chat history in Markdown format', async () => {
      const { readdir, readFile, access } = await import('fs/promises');
      
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readdir).mockResolvedValue(['session1.json'] as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        id: 'session1',
        title: 'Test Session',
        messages: [
          {
            id: 'msg1',
            role: 'user',
            content: 'Hello',
            timestamp: '2024-01-01T00:00:00.000Z'
          }
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        provider: 'openai',
        model: 'gpt-4'
      }));

      const request = new NextRequest('http://localhost/api/export/chat-history', {
        method: 'POST',
        body: JSON.stringify({
          format: 'markdown'
        })
      });

      const response = await exportChatHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.contentType).toBe('text/markdown');
      expect(data.data.data).toContain('# Chat History Export');
    });

    it('should get chat history export info', async () => {
      const { readdir, readFile, access } = await import('fs/promises');
      
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readdir).mockResolvedValue(['session1.json'] as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        messages: [{ id: 'msg1' }, { id: 'msg2' }],
        createdAt: '2024-01-01T00:00:00.000Z'
      }));

      const response = await getChatHistoryInfo();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalSessions).toBeGreaterThan(0);
      expect(data.data.totalMessages).toBeGreaterThan(0);
      expect(data.data.availableFormats).toEqual(['json', 'markdown']);
    });

    it('should handle invalid export format', async () => {
      const request = new NextRequest('http://localhost/api/export/chat-history', {
        method: 'POST',
        body: JSON.stringify({
          format: 'invalid'
        })
      });

      const response = await exportChatHistory(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid format');
    });
  });

  describe('Privacy Cleanup API', () => {
    it('should perform session cleanup', async () => {
      const { readdir, readFile, unlink, access } = await import('fs/promises');
      
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readdir).mockResolvedValue(['session1.json', 'session2.json'] as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        id: 'session1',
        messages: [],
        createdAt: '2023-01-01T00:00:00.000Z'
      }));
      vi.mocked(unlink).mockResolvedValue(undefined);

      // Mock fs.promises.stat
      const mockStat = vi.fn().mockResolvedValue({ size: 1024, mtime: new Date('2023-01-01') });
      vi.doMock('fs', () => ({
        promises: { stat: mockStat }
      }));

      const request = new NextRequest('http://localhost/api/privacy/cleanup', {
        method: 'POST',
        body: JSON.stringify({
          type: 'sessions',
          confirmed: true,
          olderThan: '2024-01-01T00:00:00.000Z'
        })
      });

      const response = await privacyCleanup(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.summary.sessionsDeleted).toBeGreaterThanOrEqual(0);
    });

    it('should require confirmation for cleanup', async () => {
      const request = new NextRequest('http://localhost/api/privacy/cleanup', {
        method: 'POST',
        body: JSON.stringify({
          type: 'sessions',
          confirmed: false
        })
      });

      const response = await privacyCleanup(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('must be explicitly confirmed');
    });

    it('should generate privacy report', async () => {
      const { readdir, readFile, access } = await import('fs/promises');
      
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readdir).mockResolvedValue(['session1.json'] as any);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        messages: [{ id: 'msg1' }]
      }));

      // Mock fs.promises.stat
      const mockStat = vi.fn().mockResolvedValue({ size: 1024 });
      vi.doMock('fs', () => ({
        promises: { stat: mockStat }
      }));

      const response = await getPrivacyReport();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalSessions).toBeGreaterThan(0);
      expect(data.data.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('Settings Export API', () => {
    it('should export settings in JSON format', async () => {
      const request = new NextRequest('http://localhost/api/export/settings', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          sections: ['preferences']
        })
      });

      const response = await exportSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.contentType).toBe('application/json');
      expect(data.data.exportInfo.sections).toEqual(['preferences']);
    });

    it('should export settings in YAML format', async () => {
      const request = new NextRequest('http://localhost/api/export/settings', {
        method: 'POST',
        body: JSON.stringify({
          format: 'yaml'
        })
      });

      const response = await exportSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.contentType).toBe('text/yaml');
      expect(data.data.data).toContain('# MCP Chat UI Settings Export');
    });

    it('should import settings from JSON', async () => {
      const settingsData = {
        version: '1.0.0',
        exportDate: '2024-01-01T00:00:00.000Z',
        settings: {
          preferences: { theme: 'light', language: 'en' }
        }
      };

      const request = new NextRequest('http://localhost/api/export/settings', {
        method: 'PUT',
        body: JSON.stringify({
          format: 'json',
          data: JSON.stringify(settingsData)
        })
      });

      const response = await importSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.importedSections).toEqual(['preferences']);
    });

    it('should get settings export info', async () => {
      const response = await getSettingsInfo();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.availableFormats).toEqual(['json', 'yaml']);
      expect(data.data.availableSections).toEqual(['llmProviders', 'mcpServers', 'preferences']);
    });

    it('should handle invalid import data', async () => {
      const request = new NextRequest('http://localhost/api/export/settings', {
        method: 'PUT',
        body: JSON.stringify({
          format: 'json',
          data: 'invalid json'
        })
      });

      const response = await importSettings(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid data format');
    });
  });
});