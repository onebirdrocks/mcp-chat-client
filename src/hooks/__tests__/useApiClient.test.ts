import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useApiLoading,
  useApiCall,
  useApiQueue,
  useApiRetry,
  useApiCache,
  useApiErrorHandler,
} from '../useApiClient';
import { ApiClientError, NetworkError, TimeoutError, ValidationError } from '../../services/apiClient';

// Mock the API client
vi.mock('../../services/apiClient', () => ({
  apiClient: {
    addLoadingStateListener: vi.fn(),
    getLoadingState: vi.fn(() => ({ isLoading: false })),
  },
  ApiClientError: class extends Error {
    constructor(message: string, public statusCode?: number) {
      super(message);
      this.name = 'ApiClientError';
    }
  },
  NetworkError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NetworkError';
    }
  },
  TimeoutError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'TimeoutError';
    }
  },
  ValidationError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  },
}));

describe('useApiLoading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to loading state changes', () => {
    const mockAddListener = vi.fn(() => vi.fn()); // Return unsubscribe function
    const mockGetState = vi.fn(() => ({ isLoading: false }));

    vi.mocked(require('../../services/apiClient').apiClient.addLoadingStateListener).mockImplementation(mockAddListener);
    vi.mocked(require('../../services/apiClient').apiClient.getLoadingState).mockImplementation(mockGetState);

    const { result } = renderHook(() => useApiLoading());

    expect(mockAddListener).toHaveBeenCalled();
    expect(mockGetState).toHaveBeenCalled();
    expect(result.current).toEqual({ isLoading: false });
  });

  it('should unsubscribe on unmount', () => {
    const mockUnsubscribe = vi.fn();
    const mockAddListener = vi.fn(() => mockUnsubscribe);

    vi.mocked(require('../../services/apiClient').apiClient.addLoadingStateListener).mockImplementation(mockAddListener);

    const { unmount } = renderHook(() => useApiLoading());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

describe('useApiCall', () => {
  it('should handle successful API calls', async () => {
    const { result } = renderHook(() => useApiCall<string>());

    const mockApiCall = vi.fn().mockResolvedValue('success');

    await act(async () => {
      const response = await result.current.execute(mockApiCall);
      expect(response).toBe('success');
    });

    expect(result.current.data).toBe('success');
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle API call errors', async () => {
    const { result } = renderHook(() => useApiCall());

    const mockError = new ApiClientError('Test error');
    const mockApiCall = vi.fn().mockRejectedValue(mockError);

    await act(async () => {
      try {
        await result.current.execute(mockApiCall);
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(mockError);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle non-ApiClientError errors', async () => {
    const { result } = renderHook(() => useApiCall());

    const mockError = new Error('Generic error');
    const mockApiCall = vi.fn().mockRejectedValue(mockError);

    await act(async () => {
      try {
        await result.current.execute(mockApiCall);
      } catch (error) {
        // Should be wrapped in ApiClientError
        expect(error).toBeInstanceOf(Error);
      }
    });

    expect(result.current.error).toBeInstanceOf(ApiClientError);
    expect(result.current.error?.message).toBe('Generic error');
  });

  it('should reset state correctly', () => {
    const { result } = renderHook(() => useApiCall());

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should set loading state during execution', async () => {
    const { result } = renderHook(() => useApiCall());

    const mockApiCall = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('success'), 100))
    );

    act(() => {
      result.current.execute(mockApiCall);
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('useApiQueue', () => {
  it('should manage queue items correctly', async () => {
    const { result } = renderHook(() => useApiQueue());

    const mockApiCall = vi.fn().mockResolvedValue('success');

    await act(async () => {
      await result.current.executeWithQueue('test-id', 'test-operation', mockApiCall);
    });

    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0]).toMatchObject({
      id: 'test-id',
      operation: 'test-operation',
      isLoading: false,
    });
  });

  it('should handle queue errors correctly', async () => {
    const { result } = renderHook(() => useApiQueue());

    const mockError = new ApiClientError('Test error');
    const mockApiCall = vi.fn().mockRejectedValue(mockError);

    await act(async () => {
      try {
        await result.current.executeWithQueue('test-id', 'test-operation', mockApiCall);
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });

    expect(result.current.queue[0].error).toBe(mockError);
    expect(result.current.hasErrors).toBe(true);
  });

  it('should remove items from queue', () => {
    const { result } = renderHook(() => useApiQueue());

    act(() => {
      result.current.executeWithQueue('test-id', 'test-operation', vi.fn().mockResolvedValue('success'));
    });

    act(() => {
      result.current.removeFromQueue('test-id');
    });

    expect(result.current.queue).toHaveLength(0);
  });

  it('should clear entire queue', async () => {
    const { result } = renderHook(() => useApiQueue());

    await act(async () => {
      await result.current.executeWithQueue('test-id-1', 'operation-1', vi.fn().mockResolvedValue('success'));
      await result.current.executeWithQueue('test-id-2', 'operation-2', vi.fn().mockResolvedValue('success'));
    });

    act(() => {
      result.current.clearQueue();
    });

    expect(result.current.queue).toHaveLength(0);
  });

  it('should track loading and error states', async () => {
    const { result } = renderHook(() => useApiQueue());

    const mockApiCall = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('success'), 100))
    );

    act(() => {
      result.current.executeWithQueue('test-id', 'test-operation', mockApiCall);
    });

    expect(result.current.isAnyLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isAnyLoading).toBe(false);
    });
  });
});

describe('useApiRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should retry failed requests', async () => {
    const { result } = renderHook(() => useApiRetry());

    const mockApiCall = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce('success');

    const promise = act(async () => {
      return result.current.retry(mockApiCall);
    });

    // Fast-forward through retry delays
    vi.advanceTimersByTime(7000); // 1000 + 2000 + 4000 (exponential backoff)

    const response = await promise;

    expect(mockApiCall).toHaveBeenCalledTimes(3);
    expect(response).toBe('success');
  });

  it('should not retry client errors', async () => {
    const { result } = renderHook(() => useApiRetry());

    const clientError = new ApiClientError('Bad request', 400);
    const mockApiCall = vi.fn().mockRejectedValue(clientError);

    await act(async () => {
      try {
        await result.current.retry(mockApiCall);
      } catch (error) {
        expect(error).toBe(clientError);
      }
    });

    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry callback', async () => {
    const { result } = renderHook(() => useApiRetry());

    const onRetry = vi.fn();
    const mockApiCall = vi.fn()
      .mockRejectedValueOnce(new Error('Failure'))
      .mockResolvedValueOnce('success');

    const promise = act(async () => {
      return result.current.retry(mockApiCall, onRetry);
    });

    vi.advanceTimersByTime(1000);

    await promise;

    expect(onRetry).toHaveBeenCalledWith(1);
  });
});

describe('useApiCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should cache and retrieve data', async () => {
    const { result } = renderHook(() => useApiCache<string>('test-key'));

    const mockApiCall = vi.fn().mockResolvedValue('cached-data');

    // First call should execute API call
    const firstResult = await act(async () => {
      return result.current.executeWithCache('cache-key', mockApiCall);
    });

    expect(firstResult).toBe('cached-data');
    expect(mockApiCall).toHaveBeenCalledTimes(1);

    // Second call should return cached data
    const secondResult = await act(async () => {
      return result.current.executeWithCache('cache-key', mockApiCall);
    });

    expect(secondResult).toBe('cached-data');
    expect(mockApiCall).toHaveBeenCalledTimes(1); // Should not be called again
  });

  it('should expire cached data after TTL', async () => {
    const { result } = renderHook(() => useApiCache<string>('test-key', 1000)); // 1 second TTL

    const mockApiCall = vi.fn()
      .mockResolvedValueOnce('first-data')
      .mockResolvedValueOnce('second-data');

    // First call
    await act(async () => {
      await result.current.executeWithCache('cache-key', mockApiCall);
    });

    // Fast-forward past TTL
    vi.advanceTimersByTime(1001);

    // Second call should execute API call again
    const secondResult = await act(async () => {
      return result.current.executeWithCache('cache-key', mockApiCall);
    });

    expect(secondResult).toBe('second-data');
    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  it('should force refresh when requested', async () => {
    const { result } = renderHook(() => useApiCache<string>('test-key'));

    const mockApiCall = vi.fn()
      .mockResolvedValueOnce('first-data')
      .mockResolvedValueOnce('second-data');

    // First call
    await act(async () => {
      await result.current.executeWithCache('cache-key', mockApiCall);
    });

    // Force refresh
    const secondResult = await act(async () => {
      return result.current.executeWithCache('cache-key', mockApiCall, true);
    });

    expect(secondResult).toBe('second-data');
    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  it('should manage cache manually', () => {
    const { result } = renderHook(() => useApiCache<string>('test-key'));

    act(() => {
      result.current.set('manual-key', 'manual-data');
    });

    const retrieved = result.current.get('manual-key');
    expect(retrieved).toBe('manual-data');

    act(() => {
      result.current.remove('manual-key');
    });

    const afterRemoval = result.current.get('manual-key');
    expect(afterRemoval).toBeNull();
  });
});

describe('useApiErrorHandler', () => {
  it('should handle different error types correctly', () => {
    const { result } = renderHook(() => useApiErrorHandler());

    // Network error
    const networkError = new NetworkError('Network failed');
    expect(result.current.getErrorMessage(networkError)).toBe(
      'Unable to connect to the server. Please check your internet connection and try again.'
    );

    // Timeout error
    const timeoutError = new TimeoutError('Request timeout');
    expect(result.current.getErrorMessage(timeoutError)).toBe(
      'The request took too long to complete. Please try again.'
    );

    // Validation error
    const validationError = new ValidationError('Invalid input');
    expect(result.current.getErrorMessage(validationError)).toBe(
      'The provided data is invalid. Please check your input and try again.'
    );

    // 401 error
    const authError = new ApiClientError('Unauthorized', 401);
    expect(result.current.getErrorMessage(authError)).toBe(
      'Authentication failed. Please check your API credentials.'
    );

    // 404 error
    const notFoundError = new ApiClientError('Not found', 404);
    expect(result.current.getErrorMessage(notFoundError)).toBe(
      'The requested resource was not found.'
    );

    // Generic error
    const genericError = new ApiClientError('Something went wrong');
    expect(result.current.getErrorMessage(genericError)).toBe('Something went wrong');
  });

  it('should handle unknown errors', () => {
    const { result } = renderHook(() => useApiErrorHandler());

    const unknownError = new Error('Unknown error');
    expect(result.current.handleError(unknownError)).toBe('Unknown error');

    const nonError = 'string error';
    expect(result.current.handleError(nonError)).toBe(
      'An unexpected error occurred. Please try again.'
    );
  });
});