import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  apiClient, 
  ApiClientError,
  NetworkError,
  TimeoutError,
  ValidationError,
  type LoadingState 
} from '../services/apiClient';

// Hook for managing API loading states
export function useApiLoading() {
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: false });
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to loading state changes
    unsubscribeRef.current = apiClient.addLoadingStateListener(setLoadingState);
    
    // Set initial state
    setLoadingState(apiClient.getLoadingState());

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return loadingState;
}

// Hook for making API calls with error handling
export function useApiCall<T = any>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      setData(result);
      return result;
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err);
      } else {
        setError(new ApiClientError(
          err instanceof Error ? err.message : 'Unknown error occurred'
        ));
      }
      throw err;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    error,
    isLoading,
    execute,
    reset,
  };
}

// Hook for managing multiple concurrent API calls
export function useApiQueue() {
  const [queue, setQueue] = useState<Array<{
    id: string;
    operation: string;
    isLoading: boolean;
    error?: ApiClientError;
  }>>([]);

  const addToQueue = useCallback((id: string, operation: string) => {
    setQueue(prev => [...prev, { id, operation, isLoading: true }]);
  }, []);

  const updateQueueItem = useCallback((id: string, updates: {
    isLoading?: boolean;
    error?: ApiClientError;
  }) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const executeWithQueue = useCallback(async <T>(
    id: string,
    operation: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    addToQueue(id, operation);

    try {
      const result = await apiCall();
      updateQueueItem(id, { isLoading: false });
      return result;
    } catch (error) {
      const apiError = error instanceof ApiClientError 
        ? error 
        : new ApiClientError(error instanceof Error ? error.message : 'Unknown error');
      
      updateQueueItem(id, { isLoading: false, error: apiError });
      throw error;
    }
  }, [addToQueue, updateQueueItem]);

  return {
    queue,
    executeWithQueue,
    removeFromQueue,
    clearQueue,
    isAnyLoading: queue.some(item => item.isLoading),
    hasErrors: queue.some(item => item.error),
  };
}

// Hook for retry functionality
export function useApiRetry() {
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries] = useState(3);

  const retry = useCallback(async <T>(
    apiCall: () => Promise<T>,
    onRetry?: (attempt: number) => void
  ): Promise<T> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt);
        
        if (attempt > 0 && onRetry) {
          onRetry(attempt);
        }

        const result = await apiCall();
        setRetryCount(0); // Reset on success
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on certain errors
        if (error instanceof ApiClientError && 
            error.statusCode && 
            error.statusCode >= 400 && 
            error.statusCode < 500) {
          break;
        }

        // Wait before retrying (except on last attempt)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    setRetryCount(0);
    throw lastError;
  }, [maxRetries]);

  return {
    retry,
    retryCount,
    maxRetries,
    canRetry: retryCount < maxRetries,
  };
}

// Hook for caching API responses
export function useApiCache<T = any>(key: string, ttl: number = 5 * 60 * 1000) { // 5 minutes default TTL
  const [cache, setCache] = useState<Map<string, {
    data: T;
    timestamp: number;
  }>>(new Map());

  const get = useCallback((cacheKey: string): T | null => {
    const cached = cache.get(cacheKey);
    
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - cached.timestamp > ttl) {
      cache.delete(cacheKey);
      setCache(new Map(cache));
      return null;
    }

    return cached.data;
  }, [cache, ttl]);

  const set = useCallback((cacheKey: string, data: T) => {
    const newCache = new Map(cache);
    newCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
    setCache(newCache);
  }, [cache]);

  const remove = useCallback((cacheKey: string) => {
    const newCache = new Map(cache);
    newCache.delete(cacheKey);
    setCache(newCache);
  }, [cache]);

  const clear = useCallback(() => {
    setCache(new Map());
  }, []);

  const executeWithCache = useCallback(async <R>(
    cacheKey: string,
    apiCall: () => Promise<R>,
    forceRefresh: boolean = false
  ): Promise<R> => {
    // Try to get from cache first
    if (!forceRefresh) {
      const cached = get(cacheKey) as R | null;
      if (cached !== null) {
        return cached;
      }
    }

    // Execute API call and cache result
    const result = await apiCall();
    set(cacheKey, result as T);
    return result;
  }, [get, set]);

  return {
    get,
    set,
    remove,
    clear,
    executeWithCache,
    cacheSize: cache.size,
  };
}

// Utility hook for handling API errors with user-friendly messages
export function useApiErrorHandler() {
  const getErrorMessage = useCallback((error: ApiClientError): string => {
    // Map specific error types to user-friendly messages
    switch (error.name) {
      case 'NetworkError':
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      
      case 'TimeoutError':
        return 'The request took too long to complete. Please try again.';
      
      case 'ValidationError':
        return 'The provided data is invalid. Please check your input and try again.';
      
      default:
        // Handle specific status codes
        if (error.statusCode) {
          switch (error.statusCode) {
            case 401:
              return 'Authentication failed. Please check your API credentials.';
            case 403:
              return 'You do not have permission to perform this action.';
            case 404:
              return 'The requested resource was not found.';
            case 429:
              return 'Too many requests. Please wait a moment and try again.';
            case 500:
              return 'Server error. Please try again later.';
            case 503:
              return 'Service temporarily unavailable. Please try again later.';
            default:
              return error.message || 'An unexpected error occurred. Please try again.';
          }
        }
        
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }, []);

  const handleError = useCallback((error: unknown): string => {
    if (error instanceof ApiClientError) {
      return getErrorMessage(error);
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }, [getErrorMessage]);

  return {
    getErrorMessage,
    handleError,
  };
}