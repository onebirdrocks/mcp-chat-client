import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, DELETE } from '../chat-history/route';

describe('Chat History API', () => {
  describe('GET /api/chat-history', () => {
    it('should return chat history with default parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat-history');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.sessions).toBeDefined();
      expect(Array.isArray(data.data.sessions)).toBe(true);
      expect(data.data.total).toBeDefined();
      expect(data.data.hasMore).toBeDefined();
      expect(data.data.pagination).toBeDefined();
    });

    it('should return chat history with query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat-history?limit=10&offset=0&sortBy=createdAt&sortOrder=asc');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.pagination.limit).toBe(10);
      expect(data.data.pagination.offset).toBe(0);
    });

    it('should return error for invalid sortBy parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat-history?sortBy=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid sortBy parameter');
    });

    it('should return error for invalid sortOrder parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat-history?sortOrder=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid sortOrder parameter');
    });
  });

  describe('DELETE /api/chat-history', () => {
    it('should return error when deletion is not confirmed', async () => {
      const requestBody = {
        sessionIds: ['test-session-1', 'test-session-2'],
        confirmed: false,
      };

      const request = new NextRequest('http://localhost:3000/api/chat-history', {
        method: 'DELETE',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Deletion must be confirmed');
    });

    it('should return error when neither sessionIds nor olderThanDays is provided', async () => {
      const requestBody = {
        confirmed: true,
      };

      const request = new NextRequest('http://localhost:3000/api/chat-history', {
        method: 'DELETE',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Either sessionIds or olderThanDays must be provided');
    });

    it('should delete sessions by IDs when confirmed', async () => {
      const requestBody = {
        sessionIds: ['non-existent-session'],
        confirmed: true,
      };

      const request = new NextRequest('http://localhost:3000/api/chat-history', {
        method: 'DELETE',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deletedCount).toBe(0); // No sessions to delete
      expect(data.data.message).toContain('Successfully deleted 0 session(s)');
    });

    it('should delete old sessions when confirmed', async () => {
      const requestBody = {
        olderThanDays: 30,
        confirmed: true,
      };

      const request = new NextRequest('http://localhost:3000/api/chat-history', {
        method: 'DELETE',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deletedCount).toBeDefined();
      expect(data.data.message).toContain('Successfully deleted');
    });
  });
});