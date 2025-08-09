import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiClient,
  ApiClientError,
  NetworkError,
  TimeoutError,
  ValidationError,
} from '../apiClient';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('http://test-api.com');
    mockFetch.mockClear();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic HTTP methods', () => {
    it('should make GET requests correctly', async () => {
      const mockResponse = { data: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: expect.any(AbortSignal),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should make POST requests with data', async () => {
      const mockResponse = { success: true };
      const requestData = { message: 'hello' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.post('/test', requestData);

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: expect.any(AbortSignal),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should make PUT requests correctly', async () => {
      const mockResponse = { updated: true };
      const requestData = { id: 1, name: 'updated' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.put('/test/1', requestData);

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/test/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: expect.any(AbortSignal),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should make DELETE requests correctly', async () => {
      const mockResponse = { deleted: true };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.delete('/test/1');

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/test/1', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: expect.any(AbortSignal),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error handling', () => {
    it('should handle HTTP errors correctly', async () => {
      const errorResponse = {
        error: 'Not Found',
        message: 'Resource not found',
        statusCode: 404,
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorResponse),
      });

      await expect(client.get('/test')).rejects.toThrow(ApiClientError);
    });


  });



  describe('Interceptors', () => {
    it('should apply request interceptors', async () => {
      const requestInterceptor = vi.fn((config) => ({
        ...config,
        headers: {
          ...config.headers,
          'Custom-Header': 'test-value',
        },
      }));

      client.addRequestInterceptor(requestInterceptor);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await client.get('/test');

      expect(requestInterceptor).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Custom-Header': 'test-value',
        },
        signal: expect.any(AbortSignal),
      });
    });

    it('should apply response interceptors', async () => {
      const responseInterceptor = vi.fn((response) => response);
      client.addResponseInterceptor(responseInterceptor);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await client.get('/test');

      expect(responseInterceptor).toHaveBeenCalled();
    });
  });

  describe('Loading state management', () => {
    it('should allow unsubscribing from loading state', () => {
      const loadingStateListener = vi.fn();
      const unsubscribe = client.addLoadingStateListener(loadingStateListener);

      unsubscribe();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      client.get('/test');

      expect(loadingStateListener).not.toHaveBeenCalled();
    });
  });
});