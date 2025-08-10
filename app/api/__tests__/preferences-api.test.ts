import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../preferences/route';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock file system operations
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn(),
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
}));

describe('Preferences API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/preferences', () => {
    it('should return default preferences', async () => {
      const request = new NextRequest('http://localhost:3000/api/preferences');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences).toBeDefined();
      expect(data.preferences.theme).toBe('system');
      expect(data.preferences.language).toBe('en');
      expect(data.preferences.autoScroll).toBe(true);
    });

    it('should include all preference categories', async () => {
      const request = new NextRequest('http://localhost:3000/api/preferences');
      
      const response = await GET(request);
      const data = await response.json();

      expect(data.preferences).toHaveProperty('theme');
      expect(data.preferences).toHaveProperty('language');
      expect(data.preferences).toHaveProperty('autoScroll');
      expect(data.preferences).toHaveProperty('soundEnabled');
      expect(data.preferences).toHaveProperty('confirmToolCalls');
      expect(data.preferences).toHaveProperty('showTokenCount');
      expect(data.preferences).toHaveProperty('accessibility');
    });
  });

  describe('POST /api/preferences', () => {
    it('should update specific preferences', async () => {
      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'dark',
          language: 'zh',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.preferences.theme).toBe('dark');
      expect(data.preferences.language).toBe('zh');
      expect(data.message).toBe('Preferences updated successfully');
    });

    it('should validate preference values', async () => {
      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'invalid-theme',
          language: 'invalid-lang',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.details).toBeDefined();
    });

    it('should handle accessibility preferences', async () => {
      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'POST',
        body: JSON.stringify({
          accessibility: {
            highContrast: true,
            reducedMotion: true,
            screenReaderOptimized: true,
            fontSize: 'large',
          },
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences.accessibility.highContrast).toBe(true);
      expect(data.preferences.accessibility.reducedMotion).toBe(true);
      expect(data.preferences.accessibility.screenReaderOptimized).toBe(true);
      expect(data.preferences.accessibility.fontSize).toBe('large');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON in request body');
    });
  });

  describe('PUT /api/preferences', () => {
    it('should replace all preferences', async () => {
      const newPreferences = {
        theme: 'light',
        language: 'en',
        autoScroll: false,
        soundEnabled: false,
        confirmToolCalls: false,
        showTokenCount: false,
        accessibility: {
          highContrast: false,
          reducedMotion: false,
          screenReaderOptimized: false,
          fontSize: 'medium',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'PUT',
        body: JSON.stringify(newPreferences),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.preferences).toEqual(newPreferences);
      expect(data.message).toBe('All preferences replaced successfully');
    });

    it('should validate complete preference structure', async () => {
      const incompletePreferences = {
        theme: 'dark',
        // Missing required fields
      };

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'PUT',
        body: JSON.stringify(incompletePreferences),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('DELETE /api/preferences', () => {
    it('should reset preferences to defaults', async () => {
      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.preferences.theme).toBe('system');
      expect(data.preferences.language).toBe('en');
      expect(data.preferences.autoScroll).toBe(true);
      expect(data.message).toBe('Preferences reset to defaults');
    });

    it('should restore default accessibility settings', async () => {
      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(data.preferences.accessibility).toEqual({
        highContrast: false,
        reducedMotion: false,
        screenReaderOptimized: false,
        fontSize: 'medium',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const request = new NextRequest('http://localhost:3000/api/preferences');
      
      const response = await GET(request);
      const data = await response.json();

      // Should return defaults when file doesn't exist
      expect(response.status).toBe(200);
      expect(data.preferences).toBeDefined();
    });

    it('should handle write errors during preference updates', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Write failed'));

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'POST',
        body: JSON.stringify({ theme: 'dark' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to save preferences');
    });
  });

  describe('Preference Validation', () => {
    it('should validate theme values', async () => {
      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'POST',
        body: JSON.stringify({ theme: 'invalid' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('theme');
    });

    it('should validate language values', async () => {
      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'POST',
        body: JSON.stringify({ language: 'invalid' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('language');
    });

    it('should validate accessibility fontSize values', async () => {
      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'POST',
        body: JSON.stringify({
          accessibility: { fontSize: 'invalid' }
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('fontSize');
    });
  });
});