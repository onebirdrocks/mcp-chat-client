// Export API client and related utilities
export {
  ApiClient,
  ApiClientError,
  NetworkError,
  TimeoutError,
  ValidationError,
  apiClient,
  chatApi,
  settingsApi,
  healthApi,
} from './apiClient';

export type {
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  RequestConfig,
  LoadingState,
  LoadingStateListener,
} from './apiClient';

// Re-export hooks for convenience
export {
  useApiLoading,
  useApiCall,
  useApiQueue,
  useApiRetry,
  useApiCache,
  useApiErrorHandler,
} from '../hooks/useApiClient';