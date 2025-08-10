'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { NotificationProvider, useNotifications } from './ui/UserFeedback';
import { LoadingOverlay } from './ui/LoadingStates';
import { useChatStore } from '../store/chatStore';
import { useSettingsStore } from '../store/settingsStore';

interface IntegrationManagerProps {
  children: React.ReactNode;
}

/**
 * Integration Manager that handles cross-component communication and state synchronization
 */
const IntegrationManagerInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const { showError, showSuccess, showWarning } = useNotifications();
  
  // Chat store state
  const chatStore = useChatStore();
  
  // Settings store state
  const settingsStore = useSettingsStore();

  // Initialize all stores and services
  const initializeApplication = useCallback(async () => {
    if (hasInitialized) return;
    
    try {
      setIsInitializing(true);
      setInitializationError(null);

      // Initialize settings store first (required for other services)
      await settingsStore.loadSettings();
      
      // Check system health
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const healthData = await response.json();
          if (healthData.warnings && healthData.warnings.length > 0) {
            healthData.warnings.forEach((warning: string) => {
              showWarning('System Warning', warning);
            });
          }
        }
      } catch (error) {
        console.warn('Health check failed:', error);
        showWarning(
          'System Health Check Failed',
          'Some features may not work correctly. Please check your network connection.'
        );
      }
      
      setHasInitialized(true);
      setIsInitializing(false);
      showSuccess('Application initialized', 'All systems are ready');
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      setInitializationError(errorMessage);
      setIsInitializing(false);
      
      showError(
        'Initialization Failed',
        'Some features may not work correctly. Please refresh the page or check your configuration.',
        true
      );
    }
  }, [hasInitialized, showError, showSuccess, showWarning]);

  // Perform system health check
  const performHealthCheck = useCallback(async () => {
    try {
      // Check API connectivity
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const healthData = await response.json();
      
      // Check for warnings
      if (healthData.warnings && healthData.warnings.length > 0) {
        healthData.warnings.forEach((warning: string) => {
          showWarning('System Warning', warning);
        });
      }
      
    } catch (error) {
      console.warn('Health check failed:', error);
      showWarning(
        'System Health Check Failed',
        'Some features may not work correctly. Please check your network connection.'
      );
    }
  }, [showWarning]);

  // Initialize on mount
  useEffect(() => {
    if (!hasInitialized) {
      initializeApplication();
    }
  }, []); // Empty dependency array to run only once

  // Handle global errors
  const handleGlobalError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Global error caught by IntegrationManager:', error, errorInfo);
    
    showError(
      'Application Error',
      'An unexpected error occurred. The application will attempt to recover automatically.',
      true
    );
    
    // Report error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // reportErrorToService(error, errorInfo);
    }
  }, [showError]);

  // Show initialization loading state
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Initializing Application
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Setting up your chat environment...
          </p>
        </div>
      </div>
    );
  }

  // Show initialization error state
  if (initializationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Initialization Failed
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {initializationError}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
            <button
              onClick={initializeApplication}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary onError={handleGlobalError} resetOnPropsChange={true}>
      <LoadingOverlay 
        isLoading={settingsStore.isLoading || settingsStore.isSaving} 
        text="Processing..."
        backdrop={false}
      >
        {children}
      </LoadingOverlay>
    </ErrorBoundary>
  );
};

/**
 * Main Integration Manager component with notification provider
 */
export const IntegrationManager: React.FC<IntegrationManagerProps> = ({ children }) => {
  return (
    <NotificationProvider maxNotifications={5} defaultDuration={5000}>
      <IntegrationManagerInner>
        {children}
      </IntegrationManagerInner>
    </NotificationProvider>
  );
};

/**
 * Hook for accessing integration manager functionality
 */
export const useIntegration = () => {
  const notifications = useNotifications();
  const chatStore = useChatStore();
  const settingsStore = useSettingsStore();

  const handleAsyncOperation = useCallback(async (
    operation: () => Promise<any>,
    options?: {
      loadingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
      showNotifications?: boolean;
    }
  ): Promise<any> => {
    const {
      loadingMessage,
      successMessage,
      errorMessage = 'Operation failed',
      showNotifications = true
    } = options || {};

    try {
      if (loadingMessage && showNotifications) {
        notifications.showInfo('Processing', loadingMessage);
      }

      const result = await operation();

      if (successMessage && showNotifications) {
        notifications.showSuccess('Success', successMessage);
      }

      return result;
    } catch (error) {
      console.error('Async operation failed:', error);
      
      if (showNotifications) {
        const message = error instanceof Error ? error.message : errorMessage;
        notifications.showError('Error', message);
      }

      return null;
    }
  }, [notifications]);

  const validateSystemState = useCallback(() => {
    const issues: string[] = [];

    // Check provider configuration
    const activeProviders = settingsStore.llmProviders.filter((p: any) => p.enabled);
    if (activeProviders.length === 0) {
      issues.push('No LLM providers configured');
    }

    // Check MCP server status
    const activeMcpServers = settingsStore.mcpServers.filter((s: any) => s.enabled);
    if (activeMcpServers.length === 0) {
      issues.push('No MCP servers configured');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }, [settingsStore.llmProviders, settingsStore.mcpServers]);

  const recoverFromError = useCallback(async () => {
    try {
      // Reinitialize stores
      await settingsStore.loadSettings();

      notifications.showSuccess('Recovery Complete', 'System has been restored');
      return true;
    } catch (error) {
      console.error('Recovery failed:', error);
      notifications.showError('Recovery Failed', 'Unable to recover from error state');
      return false;
    }
  }, [settingsStore, notifications]);

  return {
    notifications,
    handleAsyncOperation,
    validateSystemState,
    recoverFromError
  };
};

export default IntegrationManager;