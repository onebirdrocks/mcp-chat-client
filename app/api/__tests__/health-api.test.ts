import { GET } from '../health/route';
import { describe, it, expect } from 'vitest';

describe('Health API Route', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
      expect(data.uptime).toBeDefined();
    });

    it('should return valid timestamp', async () => {
      const response = await GET();
      const data = await response.json();

      const timestamp = new Date(data.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should return uptime as number', async () => {
      const response = await GET();
      const data = await response.json();

      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should have correct response headers', async () => {
      const response = await GET();

      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should be consistent across multiple calls', async () => {
      const response1 = await GET();
      const data1 = await response1.json();

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const response2 = await GET();
      const data2 = await response2.json();

      expect(data1.status).toBe(data2.status);
      expect(data2.uptime).toBeGreaterThanOrEqual(data1.uptime);
      expect(new Date(data2.timestamp).getTime()).toBeGreaterThanOrEqual(new Date(data1.timestamp).getTime());
    });
  });
});