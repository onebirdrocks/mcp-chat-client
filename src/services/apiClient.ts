import type {
  ChatRequest,
  ChatResponse,
  RunToolRequest,
  RunToolResponse,
  ChatHistoryResponse,
  Settings,
  ApiError,
  ChatSession,
} from '../types';

// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Error types
export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class NetworkError extends ApiClientError {
  constructor(message: string, originalError?: Error) {
    super(message, undefined, originalError);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiClientError {
  constructor(message: string = 'Request timeout') {
    super(message, 408);
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends ApiClientError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

// Request/Response interceptor types
export interface RequestInterceptor {
  (config: RequestConfig): RequestConfig | Promise<RequestConfig>;
}

export interface ResponseInterceptor {
  (response: Response): Response | Promise<Response>;
}

export interface ErrorInterceptor {
  (error: ApiClientError): ApiClientError | Promise<ApiClientError>;
}

// Request configuration
export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
}

// Loading state management
export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  progress?: number;
}

export type LoadingStateListener = (state: LoadingState) => void;

// API Client class
export class ApiClient {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private loadingStateListeners: LoadingStateListener[] = [];
  private currentLoadingState: LoadingState = { isLoading: false };

  constructor(private baseUrl: string = API_BASE_URL) {}

  // Interceptor management
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  // Loading state management
  addLoadingStateListener(listener: LoadingStateListener): () => void {
    this.loadingStateListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.loadingStateListeners.indexOf(listener);
      if (index > -1) {
        this.loadingStateListeners.splice(index, 1);
      }
    };
  }

  private setLoadingState(state: Partial<LoadingState>): void {
    this.currentLoadingState = { ...this.currentLoadingState, ...state };
    this.loadingStateListeners.forEach(listener => listener(this.currentLoadingState));
  }

  getLoadingState(): LoadingState {
    return { ...this.currentLoadingState };
  }

  // Utility methods
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createAbortController(timeout: number): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller;
  }

  private async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = config;
    
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }
    
    return processedConfig;
  }

  private async applyResponseInterceptors(response: Response): Promise<Response> {
    let processedResponse = response;
    
    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor(processedResponse);
    }
    
    return processedResponse;
  }

  private async applyErrorInterceptors(error: ApiClientError): Promise<ApiClientError> {
    let processedError = error;
    
    for (const interceptor of this.errorInterceptors) {
      processedError = await interceptor(processedError);
    }
    
    return processedError;
  }

  // Core request method with retry logic
  private async makeRequest<T>(config: RequestConfig): Promise<T> {
    const processedConfig = await this.applyRequestInterceptors(config);
    const {
      method,
      url,
      data,
      headers = {},
      timeout = DEFAULT_TIMEOUT,
      retries = MAX_RETRIES,
      retryDelay = RETRY_DELAY,
      signal,
    } = processedConfig;

    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    
    // Set loading state
    this.setLoadingState({ 
      isLoading: true, 
      operation: `${method} ${url}` 
    });

    let lastError: ApiClientError | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create abort controller for timeout (unless signal is provided)
        const controller = signal ? undefined : this.createAbortController(timeout);
        const requestSignal = signal || controller?.signal;

        const requestInit: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          signal: requestSignal,
        };

        if (data && method !== 'GET') {
          requestInit.body = JSON.stringify(data);
        }

        console.log('🌐 Making fetch request to:', fullUrl, 'with method:', method);
        const response = await fetch(fullUrl, requestInit);
        console.log('🌐 Received response:', response.status, response.statusText);
        const processedResponse = await this.applyResponseInterceptors(response);

        if (!processedResponse.ok) {
          let errorMessage = `HTTP ${processedResponse.status}: ${processedResponse.statusText}`;
          let apiError: ApiError | null = null;

          try {
            const errorData = await processedResponse.json();
            if (errorData.error || errorData.message) {
              apiError = errorData as ApiError;
              errorMessage = apiError.message || apiError.error || errorMessage;
            }
          } catch {
            // If we can't parse the error response, use the default message
          }

          const error = new ApiClientError(
            errorMessage,
            processedResponse.status
          );

          throw await this.applyErrorInterceptors(error);
        }

        const result = await processedResponse.json();
        console.log('🌐 API Response received:', result);
        
        // Clear loading state on success
        this.setLoadingState({ isLoading: false });
        
        return result;

      } catch (error) {
        if (error instanceof ApiClientError) {
          lastError = error;
        } else if (error instanceof DOMException && error.name === 'AbortError') {
          lastError = new TimeoutError('Request timeout');
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
          lastError = new NetworkError('Network error - please check your connection', error as Error);
        } else {
          lastError = new ApiClientError(
            error instanceof Error ? error.message : 'Unknown error occurred',
            undefined,
            error as Error
          );
        }

        // Don't retry on certain errors
        if (lastError instanceof ValidationError || 
            lastError instanceof TimeoutError ||
            (lastError.statusCode && lastError.statusCode >= 400 && lastError.statusCode < 500)) {
          break;
        }

        // Wait before retrying (except on last attempt)
        if (attempt < retries) {
          await this.sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    // Clear loading state on error
    this.setLoadingState({ isLoading: false });

    if (lastError) {
      throw await this.applyErrorInterceptors(lastError);
    }

    throw new ApiClientError('Request failed after all retry attempts');
  }

  // HTTP method helpers
  async get<T>(url: string, config?: Partial<RequestConfig>): Promise<T> {
    return this.makeRequest<T>({
      method: 'GET',
      url,
      ...config,
    });
  }

  async post<T>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<T> {
    return this.makeRequest<T>({
      method: 'POST',
      url,
      data,
      ...config,
    });
  }

  async put<T>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<T> {
    return this.makeRequest<T>({
      method: 'PUT',
      url,
      data,
      ...config,
    });
  }

  async delete<T>(url: string, config?: Partial<RequestConfig>): Promise<T> {
    return this.makeRequest<T>({
      method: 'DELETE',
      url,
      ...config,
    });
  }

  async patch<T>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<T> {
    return this.makeRequest<T>({
      method: 'PATCH',
      url,
      data,
      ...config,
    });
  }
}

// Create default API client instance
export const apiClient = new ApiClient();

// Add default request interceptor for authentication/headers
apiClient.addRequestInterceptor((config) => {
  // Add any default headers or authentication here
  return {
    ...config,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      ...config.headers,
    },
  };
});

// Add default error interceptor for logging
apiClient.addErrorInterceptor((error) => {
  console.error('API Error:', {
    message: error.message,
    statusCode: error.statusCode,
    originalError: error.originalError,
  });
  return error;
});

// Type-safe API methods
export const chatApi = {
  // Send a chat message
  sendMessage: (request: ChatRequest): Promise<ChatResponse> => {
    console.log('🌐 API Client: Sending chat request to /chat', {
      ...request,
      // Note: API key is now handled securely by the backend
    });
    return apiClient.post<ChatResponse>('/chat', request, {
      timeout: 60000, // Longer timeout for chat responses
    });
  },

  // Execute a tool
  runTool: (request: RunToolRequest): Promise<RunToolResponse> => {
    return apiClient.post<RunToolResponse>('/run-tool', request, {
      timeout: 120000, // Even longer timeout for tool execution
    });
  },

  // Cancel tool execution
  cancelTool: (sessionId: string): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>('/cancel-tool', { sessionId });
  },

  // Get chat history
  getChatHistory: (): Promise<ChatHistoryResponse> => {
    return apiClient.get<ChatHistoryResponse>('/chat-history');
  },

  // Get specific session
  getSession: (sessionId: string): Promise<ChatSession> => {
    return apiClient.get<ChatSession>(`/sessions/${sessionId}`);
  },

  // Delete session
  deleteSession: (sessionId: string): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(`/chat-history/${sessionId}`);
  },

  // Update session
  updateSession: (sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession> => {
    return apiClient.put<ChatSession>(`/chat-history/${sessionId}`, updates);
  },

  // Generate session title
  generateSessionTitle: (sessionId: string): Promise<{ title: string }> => {
    return apiClient.post<{ title: string }>(`/chat-history/${sessionId}/generate-title`);
  },
};

export const settingsApi = {
  // Get settings
  getSettings: (): Promise<Settings> => {
    return apiClient.get<Settings>('/settings');
  },

  // Update settings
  updateSettings: (settings: Settings): Promise<Settings> => {
    return apiClient.post<Settings>('/settings', settings);
  },
};

export const healthApi = {
  // Health check
  checkHealth: (): Promise<{ status: string; timestamp: string }> => {
    return apiClient.get<{ status: string; timestamp: string }>('/health');
  },
};

// Export everything
export default apiClient;