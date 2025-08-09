# API Client Service

This directory contains the API client implementation for the MCP Chat UI frontend. The API client provides a robust, type-safe interface for communicating with the backend services.

## Features

- **Type-safe API calls** with TypeScript interfaces
- **Automatic retry logic** with exponential backoff
- **Request/response interceptors** for authentication and logging
- **Loading state management** with global state tracking
- **Comprehensive error handling** with user-friendly error messages
- **Request timeout and cancellation** support
- **Caching capabilities** for improved performance

## Core Components

### ApiClient Class

The main `ApiClient` class provides the core HTTP functionality:

```typescript
import { ApiClient } from './apiClient';

const client = new ApiClient('https://api.example.com');

// Basic HTTP methods
const data = await client.get('/endpoint');
const result = await client.post('/endpoint', { data });
const updated = await client.put('/endpoint/1', { data });
await client.delete('/endpoint/1');
```

### Pre-configured API Endpoints

Type-safe API endpoints are provided for common operations:

```typescript
import { chatApi, settingsApi, healthApi } from './apiClient';

// Chat operations
const response = await chatApi.sendMessage(request);
const toolResult = await chatApi.runTool(toolRequest);
const history = await chatApi.getChatHistory();

// Settings operations
const settings = await settingsApi.getSettings();
const updated = await settingsApi.updateSettings(newSettings);

// Health check
const health = await healthApi.checkHealth();
```

### React Hooks

Several React hooks are provided for easier integration:

#### useApiCall

For individual API calls with loading and error state:

```typescript
import { useApiCall } from '../hooks/useApiClient';

const { execute, isLoading, error, data } = useApiCall();

const handleSubmit = async () => {
  try {
    const result = await execute(() => chatApi.sendMessage(request));
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

#### useApiLoading

For global loading state tracking:

```typescript
import { useApiLoading } from '../hooks/useApiClient';

const loadingState = useApiLoading();

if (loadingState.isLoading) {
  return <div>Loading: {loadingState.operation}</div>;
}
```

#### useApiQueue

For managing multiple concurrent API calls:

```typescript
import { useApiQueue } from '../hooks/useApiClient';

const { executeWithQueue, queue, isAnyLoading } = useApiQueue();

const handleMultipleOperations = async () => {
  await executeWithQueue('op1', 'Operation 1', () => api.call1());
  await executeWithQueue('op2', 'Operation 2', () => api.call2());
};
```

#### useApiRetry

For retry functionality with custom logic:

```typescript
import { useApiRetry } from '../hooks/useApiClient';

const { retry, retryCount, canRetry } = useApiRetry();

const handleRetryableOperation = async () => {
  await retry(() => api.unreliableCall(), (attempt) => {
    console.log(`Retry attempt ${attempt}`);
  });
};
```

#### useApiCache

For caching API responses:

```typescript
import { useApiCache } from '../hooks/useApiClient';

const { executeWithCache, get, set, clear } = useApiCache('cache-key', 300000); // 5 minutes TTL

const getCachedData = async () => {
  return executeWithCache('data-key', () => api.getData());
};
```

#### useApiErrorHandler

For consistent error message handling:

```typescript
import { useApiErrorHandler } from '../hooks/useApiClient';

const { handleError, getErrorMessage } = useApiErrorHandler();

// Convert any error to user-friendly message
const errorMessage = handleError(error);
```

## Error Handling

The API client provides comprehensive error handling with specific error types:

### Error Types

- **ApiClientError**: Base error class for API-related errors
- **NetworkError**: Network connectivity issues
- **TimeoutError**: Request timeout errors
- **ValidationError**: Input validation errors

### Error Interceptors

You can add global error interceptors for logging or custom handling:

```typescript
import { apiClient } from './apiClient';

apiClient.addErrorInterceptor((error) => {
  // Log error to monitoring service
  console.error('API Error:', error);
  
  // Transform error if needed
  return error;
});
```

## Request/Response Interceptors

### Request Interceptors

Add custom headers or authentication:

```typescript
apiClient.addRequestInterceptor((config) => {
  return {
    ...config,
    headers: {
      ...config.headers,
      'Authorization': `Bearer ${getToken()}`,
      'X-Client-Version': '1.0.0',
    },
  };
});
```

### Response Interceptors

Process responses globally:

```typescript
apiClient.addResponseInterceptor((response) => {
  // Log successful responses
  console.log('API Response:', response.status);
  
  return response;
});
```

## Configuration

### Environment-based URLs

The API client automatically uses different base URLs based on the environment:

- **Development**: `http://localhost:3001/api`
- **Production**: `/api`

### Timeout Configuration

Default timeout is 30 seconds, but can be customized per request:

```typescript
const data = await client.get('/endpoint', {
  timeout: 60000, // 60 seconds
});
```

### Retry Configuration

Retry behavior can be customized:

```typescript
const data = await client.get('/endpoint', {
  retries: 5,
  retryDelay: 2000, // 2 seconds base delay
});
```

## Loading State Management

The API client provides global loading state tracking that can be used throughout the application:

```typescript
import { useApiLoading } from '../hooks/useApiClient';

function GlobalLoadingIndicator() {
  const { isLoading, operation } = useApiLoading();
  
  if (!isLoading) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white p-2 text-center">
      {operation || 'Loading...'}
    </div>
  );
}
```

## Type Safety

All API calls are fully typed with TypeScript interfaces:

```typescript
// Request/Response types are automatically inferred
const response: ChatResponse = await chatApi.sendMessage(request);
const settings: Settings = await settingsApi.getSettings();
```

## Testing

The API client is designed to be easily testable with mocked fetch:

```typescript
import { vi } from 'vitest';
import { ApiClient } from './apiClient';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const client = new ApiClient('http://test.com');

mockFetch.mockResolvedValueOnce({
  ok: true,
  json: () => Promise.resolve({ data: 'test' }),
});

const result = await client.get('/test');
expect(result).toEqual({ data: 'test' });
```

## Best Practices

1. **Use the pre-configured API endpoints** (`chatApi`, `settingsApi`, etc.) instead of the raw client
2. **Use React hooks** for component integration to get loading states and error handling
3. **Handle errors appropriately** using the error handler hook for consistent user messages
4. **Use caching** for frequently accessed data that doesn't change often
5. **Add request interceptors** for authentication and common headers
6. **Monitor loading states** to provide good user experience
7. **Test API calls** by mocking fetch in your tests

## Example Usage

See `src/examples/ApiClientExample.tsx` for a complete example of how to use all the API client features in a React component.