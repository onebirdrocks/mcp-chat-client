import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../settings/route';
import { POST as TestConnection } from '../settings/test-connection/route';

describe('Settings API', () => {
  beforeEach(() => {
    // Reset any mocks or state before each test
  });

  describe('GET /api/settings', () => {
    it('should return settings with masked API keys', async () => {
      const response = await GET();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.llmProviders).toBeDefined();
      expect(data.data.mcpServers).toBeDefined();
      expect(data.data.preferences).toBeDefined();
    });
  });

  describe('POST /api/settings', () => {
    it('should update settings successfully', async () => {
      const requestBody = {
        preferences: {
          theme: 'dark',
          language: 'en',
          autoScroll: true,
          soundEnabled: false,
        },
      };

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Settings updated successfully');
    });

    it('should return error for invalid settings', async () => {
      const requestBody = {
        preferences: {
          theme: 'invalid-theme', // Invalid theme
        },
      };

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('DELETE /api/settings', () => {
    it('should clear sensitive data successfully', async () => {
      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Sensitive data cleared successfully');
    });
  });

  describe('POST /api/settings/test-connection', () => {
    it('should return error for missing provider', async () => {
      const requestBody = {
        apiKey: 'test-key',
      };

      const request = new NextRequest('http://localhost:3000/api/settings/test-connection', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await TestConnection(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Provider is required');
    });

    it('should return error for invalid API key format', async () => {
      const requestBody = {
        provider: 'openai',
        apiKey: 'invalid-key', // Too short
      };

      const request = new NextRequest('http://localhost:3000/api/settings/test-connection', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await TestConnection(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid API key format for provider');
    });
  });
});