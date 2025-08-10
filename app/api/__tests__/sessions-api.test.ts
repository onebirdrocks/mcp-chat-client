import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../sessions/route';
import { GET as GetSession, PUT as UpdateSession, DELETE as DeleteSession } from '../sessions/[sessionId]/route';
import { POST as AddMessage } from '../sessions/[sessionId]/messages/route';

describe('Sessions API', () => {
  let testSessionId: string;

  beforeEach(() => {
    testSessionId = 'test-session-' + Date.now();
  });

  describe('POST /api/sessions', () => {
    it('should create a new session successfully', async () => {
      const requestBody = {
        provider: 'openai',
        model: 'gpt-4',
        mcpServers: ['filesystem-1'],
        title: 'Test Chat Session',
      };

      const request = new NextRequest('http://localhost:3000/api/sessions', {
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
      expect(data.data.session).toBeDefined();
      expect(data.data.session.provider).toBe('openai');
      expect(data.data.session.model).toBe('gpt-4');
      expect(data.data.session.title).toBe('Test Chat Session');
      expect(data.message).toBe('Session created successfully');
    });

    it('should return error for missing required fields', async () => {
      const requestBody = {
        provider: 'openai',
        // Missing model
      };

      const request = new NextRequest('http://localhost:3000/api/sessions', {
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
      expect(data.error).toBe('Provider and model are required');
    });

    it('should return error for invalid provider', async () => {
      const requestBody = {
        provider: 'invalid-provider',
        model: 'gpt-4',
      };

      const request = new NextRequest('http://localhost:3000/api/sessions', {
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
      expect(data.error).toBe('Invalid provider');
    });
  });

  describe('GET /api/sessions', () => {
    it('should return sessions list', async () => {
      const response = await GET(new NextRequest('http://localhost:3000/api/sessions'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.sessions).toBeDefined();
      expect(Array.isArray(data.data.sessions)).toBe(true);
      expect(data.data.total).toBeDefined();
      expect(data.data.hasMore).toBeDefined();
    });
  });

  describe('GET /api/sessions/[sessionId]', () => {
    it('should return error for non-existent session', async () => {
      const request = new NextRequest(`http://localhost:3000/api/sessions/${testSessionId}`);
      const response = await GetSession(request, { params: { sessionId: testSessionId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });
  });

  describe('PUT /api/sessions/[sessionId]', () => {
    it('should return error for missing session ID', async () => {
      const requestBody = {
        title: 'Updated Title',
      };

      const request = new NextRequest('http://localhost:3000/api/sessions/', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await UpdateSession(request, { params: { sessionId: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Session ID is required');
    });

    it('should return error for invalid title type', async () => {
      const requestBody = {
        title: 123, // Should be string
      };

      const request = new NextRequest(`http://localhost:3000/api/sessions/${testSessionId}`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await UpdateSession(request, { params: { sessionId: testSessionId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Title must be a string');
    });
  });

  describe('DELETE /api/sessions/[sessionId]', () => {
    it('should return error for missing session ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/sessions/');
      const response = await DeleteSession(request, { params: { sessionId: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Session ID is required');
    });
  });

  describe('POST /api/sessions/[sessionId]/messages', () => {
    it('should return error for missing required fields', async () => {
      const requestBody = {
        role: 'user',
        // Missing content
      };

      const request = new NextRequest(`http://localhost:3000/api/sessions/${testSessionId}/messages`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await AddMessage(request, { params: { sessionId: testSessionId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Role and content are required');
    });

    it('should return error for invalid role', async () => {
      const requestBody = {
        role: 'invalid-role',
        content: 'Test message',
      };

      const request = new NextRequest(`http://localhost:3000/api/sessions/${testSessionId}/messages`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await AddMessage(request, { params: { sessionId: testSessionId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid message role');
    });
  });
});