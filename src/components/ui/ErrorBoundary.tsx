'use client';

import React, { Component, ReactNode } from 'react';
import Button from './Button';
import Card from './Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  eventId?: string;
}

/**
 * Enhanced Error Boundary with comprehensive error handling and recovery options
 */
export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      eventId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  public componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error state when resetKeys change
    if (hasError && resetOnPropsChange && resetKeys) {
      const prevResetKeys = prevProps.resetKeys || [];
      const hasResetKeyChanged = resetKeys.some((key, index) => 
        key !== prevResetKeys[index]
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // In a real application, you would send this to your error tracking service
    // For now, we'll just log it
    console.error('Error reported:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  };

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      eventId: undefined
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.resetErrorBoundary();
  };

  private handleRetryWithDelay = () => {
    // Show loading state briefly before retry
    this.setState({ hasError: false });
    
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, 1000);
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, eventId } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <Card className="max-w-2xl w-full p-8">
            <div className="text-center">
              {/* Error Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
                <svg 
                  className="h-8 w-8 text-red-600 dark:text-red-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>

              {/* Error Title */}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Something went wrong
              </h1>

              {/* Error Description */}
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                We encountered an unexpected error. This has been logged and we'll look into it.
                You can try refreshing the page or going back to continue.
              </p>

              {/* Error Details (Development Only) */}
              {isDevelopment && error && (
                <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left max-w-full overflow-hidden">
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                    Error Details (Development):
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-red-700 dark:text-red-300">Message:</span>
                      <pre className="text-xs text-red-600 dark:text-red-400 mt-1 whitespace-pre-wrap break-words">
                        {error.message}
                      </pre>
                    </div>
                    {error.stack && (
                      <div>
                        <span className="text-xs font-medium text-red-700 dark:text-red-300">Stack:</span>
                        <pre className="text-xs text-red-600 dark:text-red-400 mt-1 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <span className="text-xs font-medium text-red-700 dark:text-red-300">Component Stack:</span>
                        <pre className="text-xs text-red-600 dark:text-red-400 mt-1 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error ID for Support */}
              {eventId && (
                <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Error ID: <code className="font-mono">{eventId}</code>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Please include this ID when reporting the issue
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="min-w-[120px]"
                >
                  Try Again
                </Button>
                <Button
                  onClick={this.handleRetryWithDelay}
                  variant="outline"
                  className="min-w-[120px]"
                >
                  Retry in 1s
                </Button>
                <Button
                  onClick={this.handleReload}
                  className="min-w-[120px]"
                >
                  Reload Page
                </Button>
              </div>

              {/* Additional Help */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  If this problem persists, try:
                </p>
                <ul className="text-sm text-gray-500 dark:text-gray-400 mt-2 space-y-1">
                  <li>• Clearing your browser cache and cookies</li>
                  <li>• Disabling browser extensions</li>
                  <li>• Checking your internet connection</li>
                  <li>• Trying a different browser</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to create error boundary reset function
 */
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

export default ErrorBoundary;