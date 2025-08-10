import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Badge, Spinner } from './ui';
import { useChatStore } from '../store/chatStore';
import { chatApi } from '../services/apiClient';
import type { ToolExecutionStatus, ToolExecutionProgress } from '../types';

export interface ActiveToolExecutionsProps {
  sessionId?: string;
  onClose?: () => void;
}

const ActiveToolExecutions: React.FC<ActiveToolExecutionsProps> = ({
  sessionId,
  onClose,
}) => {
  const { t } = useTranslation();
  const [activeExecutions, setActiveExecutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getActiveToolExecutions, cancelToolExecution } = useChatStore();

  // Load active executions
  useEffect(() => {
    loadActiveExecutions();
    
    // Poll for updates every 2 seconds
    const interval = setInterval(loadActiveExecutions, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const loadActiveExecutions = async () => {
    try {
      // Get from store first (real-time updates)
      const storeExecutions = getActiveToolExecutions();
      
      // Also get from API for completeness
      const response = await chatApi.getActiveToolExecutions(sessionId);
      
      // Merge store and API data
      const mergedExecutions = response.activeExecutions.map(apiExec => {
        const storeExec = storeExecutions.find(se => se.toolCall.id === apiExec.toolCallId);
        return {
          ...apiExec,
          status: storeExec?.status,
          progress: storeExec?.progress,
        };
      });

      setActiveExecutions(mergedExecutions);
      setError(null);
    } catch (error) {
      console.error('Failed to load active executions:', error);
      setError(error instanceof Error ? error.message : 'Failed to load active executions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelExecution = async (toolCallId: string) => {
    try {
      await cancelToolExecution(toolCallId);
      // Refresh the list
      await loadActiveExecutions();
    } catch (error) {
      console.error('Failed to cancel execution:', error);
      setError(error instanceof Error ? error.message : 'Failed to cancel execution');
    }
  };

  const handleCancelAll = async () => {
    if (!confirm(t('activeTools.confirmCancelAll', 'Are you sure you want to cancel all active tool executions?'))) {
      return;
    }

    try {
      await chatApi.cancelAllActiveExecutions(sessionId);
      await loadActiveExecutions();
    } catch (error) {
      console.error('Failed to cancel all executions:', error);
      setError(error instanceof Error ? error.message : 'Failed to cancel all executions');
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStageColor = (stage: string): string => {
    switch (stage) {
      case 'pending':
        return 'text-gray-600 dark:text-gray-400';
      case 'validating':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'connecting':
        return 'text-blue-600 dark:text-blue-400';
      case 'executing':
        return 'text-purple-600 dark:text-purple-400';
      case 'processing':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getProgressMessage = (stage: string): string => {
    switch (stage) {
      case 'pending':
        return t('activeTools.pending', 'Preparing to execute...');
      case 'validating':
        return t('activeTools.validating', 'Validating parameters...');
      case 'connecting':
        return t('activeTools.connecting', 'Connecting to MCP server...');
      case 'executing':
        return t('activeTools.executing', 'Executing tool...');
      case 'processing':
        return t('activeTools.processing', 'Processing results...');
      default:
        return t('activeTools.working', 'Working...');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="md" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          {t('activeTools.loading', 'Loading active executions...')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('activeTools.title', 'Active Tool Executions')}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadActiveExecutions}>
            {t('common.refresh', 'Refresh')}
          </Button>
          {activeExecutions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleCancelAll}>
              {t('activeTools.cancelAll', 'Cancel All')}
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t('common.close', 'Close')}
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-red-800 dark:text-red-200">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              {t('common.dismiss', 'Dismiss')}
            </Button>
          </div>
        </div>
      )}

      {/* Active Executions List */}
      {activeExecutions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {t('activeTools.empty', 'No active tool executions')}
        </div>
      ) : (
        <div className="space-y-3">
          {activeExecutions.map((execution) => (
            <div
              key={execution.toolCallId}
              className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
            >
              {/* Execution Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Spinner size="sm" className="text-blue-600 dark:text-blue-400" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {execution.toolName}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {execution.serverId} • {formatDuration(execution.elapsedTime)} elapsed
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" size="sm">
                    {execution.status?.stage || 'running'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelExecution(execution.toolCallId)}
                    aria-label={t('activeTools.cancel', 'Cancel execution')}
                  >
                    {t('common.cancel', 'Cancel')}
                  </Button>
                </div>
              </div>

              {/* Progress Information */}
              {(execution.status || execution.progress) && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${getStageColor(execution.status?.stage || execution.progress?.stage || 'pending')}`}>
                      {getProgressMessage(execution.status?.stage || execution.progress?.stage || 'pending')}
                    </span>
                    {(execution.status?.progress !== undefined || execution.progress?.progress !== undefined) && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {execution.status?.progress || execution.progress?.progress || 0}%
                      </span>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  {(execution.status?.progress !== undefined || execution.progress?.progress !== undefined) && (
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${Math.max(0, Math.min(100, execution.status?.progress || execution.progress?.progress || 0))}%` }}
                      />
                    </div>
                  )}
                  
                  {/* Custom Message */}
                  {(execution.status?.message || execution.progress?.message) && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      {execution.status?.message || execution.progress?.message}
                    </p>
                  )}
                </div>
              )}

              {/* Parameters Preview */}
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                  {t('activeTools.viewParameters', 'View Parameters')}
                </summary>
                <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded border overflow-x-auto">
                  {JSON.stringify(execution.parameters, null, 2)}
                </pre>
              </details>

              {/* Timeout Warning */}
              {execution.elapsedTime > execution.timeout * 0.8 && (
                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-yellow-800 dark:text-yellow-200">
                      {t('activeTools.timeoutWarning', 'Tool execution is taking longer than expected')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveToolExecutions;