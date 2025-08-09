import { NextRequest } from 'next/server';
import { vi } from 'vitest';
import { GET, POST, DELETE } from '../route';
import { POST as testConnectionPOST } from '../test-connection/route';
import { GET as exportGET } from '../export/route';
import { POST as importPOST } from '../import/route';
import { GET as statsGET } from '../stats/route';

// Mock the SecureSettingsManager
vi.mock('@/services/SecureSettingsManager', () => {
  const mockManager = {
    initialize: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    clearSensitiveData: vi.fn(),
    validateApiKey: vi.fn(),
    exportSettings: vi.fn(),
    importSettings: vi.fn(),
    getStatistics: vi.fn(),
  };

  return {
    getSecureSettingsManager: () => mockManager,
  };
});

// Mock validation
vi.mock('@/lib/validation', () => ({
  validateSettings: vi.fn((data) => data),
}));

import { getSecureSettingsManager } from '@/services/SecureSettingsManager';

const mockSettingsManager = getSecureSettingsManager();

describe('Settings API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/settings', () => {
    it('should return settings successfully', async () => {
      const mockSettings = {
        llmProviders: [{
          id: 'test-provider',
          name: 'openai',
          apiKey: '••••1234',
          baseUrl: 'https://api.openai.com/v1',
          models: [],
        }],
        mcpServers: [],
        preferences: {
          theme: 'dark',
          language: 'en',
          autoScroll: true,
          soundEnabled: false,
        },
      };

      mockSettingsManager.getSettings.mockResolvedValue(mockSettings);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSettings);
      expect(mockSettingsManager.initialize).toHaveBeenCalled();
      expect(mockSettingsManager.getSettings).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockSettingsManager.getSettings.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to retrieve settings');
    });
  });

  describe('POST /api/settings', () => {
    it('should update settings successfully', async () => {
      const requestBody = {
        llmProviders: [{
          id: 'test-provider',
          name: 'openai',
          apiKey: 'sk-test123456789',
          baseUrl: 'https://api.openai.com/v1',
          models: [],
        }],
      };

      const updatedSettings = {
        ...requestBody,
        llmProviders: [{
          ...requestBody.llmProviders[0],
          apiKey: '••••6789',
        }],
      };

      mockSettingsManager.updateSettings.mockResolvedValue(updatedSettings);

      const request = new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(updatedSettings);
      expect(data.message).toBe('Settings updated successfully');
      expect(mockSettingsManager.updateSettings).toHaveBeenCalledWith(requestBody);
    });

    it('should handle validation errors', async () => {
      const request = new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' }),
        headers: { 'Content-Type': 'application/json' },
      });

      // Mock validation to throw error
      const { validateSettings } = await import('@/lib/validation');
      const { ValidationError } = await import('@/lib/errors');
      (validateSettings as any).mockImplementation(() => {
        throw new ValidationError('Invalid settings format');
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid settings format');
    });
  });

  describe('DELETE /api/settings', () => {
    it('should clear sensitive data successfully', async () => {
      mockSettingsManager.clearSensitiveData.mockResolvedValue(undefined);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Sensitive data cleared successfully');
      expect(mockSettingsManager.clearSensitiveData).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockSettingsManager.clearSensitiveData.mockRejectedValue(new Error('Clear failed'));

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to clear sensitive data');
    });
  });

  describe('POST /api/settings/test-connection', () => {
    it('should validate API key successfully', async () => {
      mockSettingsManager.validateApiKey.mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/settings/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'openai',
          apiKey: 'sk-test123456789012345',
          baseUrl: 'https://api.openai.com/v1',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await testConnectionPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.details.valid).toBe(true);
      expect(mockSettingsManager.validateApiKey).toHaveBeenCalledWith('openai', 'sk-test123456789012345');
    });

    it('should reject invalid API key', async () => {
      mockSettingsManager.validateApiKey.mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/settings/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'openai',
          apiKey: 'invalid-key',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await testConnectionPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid API key format');
    });

    it('should require provider and API key', async () => {
      const request = new NextRequest('http://localhost/api/settings/test-connection', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await testConnectionPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Provider is required');
    });
  });

  describe('GET /api/settings/export', () => {
    it('should export settings successfully', async () => {
      const mockExportData = {
        version: '1.0.0',
        exportDate: '2024-01-01T00:00:00.000Z',
        settings: {
          preferences: { theme: 'dark', language: 'en', autoScroll: true, soundEnabled: false },
          mcpServers: [],
        },
      };

      mockSettingsManager.exportSettings.mockResolvedValue(mockExportData);

      const response = await exportGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockExportData);
      expect(data.filename).toMatch(/^mcp-chat-ui-settings-.*\.json$/);
      expect(mockSettingsManager.exportSettings).toHaveBeenCalled();
    });
  });

  describe('POST /api/settings/import', () => {
    it('should import settings successfully', async () => {
      const importData = {
        version: '1.0.0',
        exportDate: '2024-01-01T00:00:00.000Z',
        settings: {
          preferences: { theme: 'light', language: 'zh', autoScroll: false, soundEnabled: true },
          mcpServers: [],
        },
      };

      mockSettingsManager.importSettings.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/settings/import', {
        method: 'POST',
        body: JSON.stringify(importData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await importPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Settings imported successfully');
      expect(data.note).toContain('API keys were not imported');
      expect(mockSettingsManager.importSettings).toHaveBeenCalledWith(importData);
    });

    it('should reject invalid import format', async () => {
      const request = new NextRequest('http://localhost/api/settings/import', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'format' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await importPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid export file format');
    });
  });

  describe('GET /api/settings/stats', () => {
    it('should return statistics successfully', async () => {
      const mockStats = {
        totalProviders: 2,
        providersWithKeys: 1,
        totalMcpServers: 3,
        enabledMcpServers: 2,
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockSettingsManager.getStatistics.mockReturnValue(mockStats);

      const response = await statsGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStats);
      expect(mockSettingsManager.getStatistics).toHaveBeenCalled();
    });
  });
});