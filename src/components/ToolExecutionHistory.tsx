import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Badge, Alert, Spinner } from './ui';
import { useChatStore } from '../store/chatStore';
import { chatApi } from '../services/apiClient';
import type { ToolExecutionHistoryEntry } from '../types';

export interface ToolExecutionHistoryProps {
  sessionId?: string;
  limit?: number;
  showStats?: boolean;
  onClose?: () => void;
}

const ToolExecutionHistory: React.FC<ToolExecutionHistoryProps> = ({
  sessionId,
  limit = 50,
  showStats = true,
  onClose,
}) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<ToolExecutionHistoryEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const { clearToolExecutionHistory } = useChatStore();

  // Load execution history
  useEffect(() => {
    loadHistory();
  }, [sessionId, limit, showStats]);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatApi.getToolExecutionHistory(sessionId, limit, showStats);
      setHistory(response.history);
      if (showStats && response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Failed to load tool execution history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm(t('toolHistory.confirmClear', 'Are you sure you want to clear the tool execution history?'))) {
      return;
    }

    try {
      await clearToolExecutionHistory();
      await loadHistory(); // Reload after clearing
    } catch (error) {
      console.error('Failed to clear history:', error);
      setError(error instanceof Error ? error.message : 'Failed to clear history');
    }
  };

  const toggleExpanded = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'timeout':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'cancelled':
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'timeout':
        return '⏱';
      case 'cancelled':
        return '⊘';
      default:
        return '?';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="md" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          {t('toolHistory.loading', 'Loading execution history...')}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" className="m-4">
        <div className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={loadHistory}>
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('toolHistory.title', 'Tool Execution History')}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadHistory}>
            {t('common.refresh', 'Refresh')}
          </Button>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearHistory}>
              {t('toolHistory.clear', 'Clear History')}
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t('common.close', 'Close')}
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      {showStats && stats && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            {t('toolHistory.statistics', 'Statistics')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                {t('toolHistory.total', 'Total')}:
              </span>
              <span className="ml-1 font-medium">{stats.total}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                {t('toolHistory.successful', 'Successful')}:
              </span>
              <span className="ml-1 font-medium text-green-600 dark:text-green-400">
                {stats.successful}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                {t('toolHistory.failed', 'Failed')}:
              </span>
              <span className="ml-1 font-medium text-red-600 dark:text-red-400">
                {stats.failed + stats.timeout}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                {t('toolHistory.avgTime', 'Avg Time')}:
              </span>
              <span className="ml-1 font-medium">
                {formatDuration(stats.averageExecutionTime)}
              </span>
            </div>
          </div>
          
          {/* Tool breakdown */}
          {Object.keys(stats.toolBreakdown).length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('toolHistory.toolBreakdown', 'Tool Usage')}:
              </h5>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.toolBreakdown).map(([tool, count]) => (
                  <Badge key={tool} variant="secondary" size="sm">
                    {tool}: {count as number}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History List */}
      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {t('toolHistory.empty', 'No tool executions found')}
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => {
            const isExpanded = expandedEntries.has(entry.id);
            
            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
              >
                {/* Entry Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getStatusColor(entry.status)}`}>
                      {getStatusIcon(entry.status)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {entry.toolName}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {entry.serverId} • {new Date(entry.startTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {entry.executionTime && (
                      <Badge variant="secondary" size="sm">
                        {formatDuration(entry.executionTime)}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(entry.id)}
                      aria-label={isExpanded ? t('common.collapse', 'Collapse') : t('common.expand', 'Expand')}
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Button>
                  </div>
                </div>

                {/* Entry Details (Expandable) */}
                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                    {/* Parameters */}
                    <div>
                      <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('toolHistory.parameters', 'Parameters')}:
                      </h5>
                      <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded border overflow-x-auto">
                        {JSON.stringify(entry.parameters, null, 2)}
                      </pre>
                    </div>

                    {/* Result or Error */}
                    {entry.result && (
                      <div>
                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('toolHistory.result', 'Result')}:
                        </h5>
                        <pre className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded border overflow-x-auto">
                          {entry.result}
                        </pre>
                      </div>
                    )}

                    {entry.error && (
                      <div>
                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('toolHistory.error', 'Error')}:
                        </h5>
                        <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded border overflow-x-auto text-red-800 dark:text-red-200">
                          {entry.error}
                        </pre>
                      </div>
                    )}

                    {/* Progress Timeline */}
                    {entry.progress && entry.progress.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('toolHistory.progress', 'Execution Progress')}:
                        </h5>
                        <div className="space-y-2">
                          {entry.progress.map((progress, index) => (
                            <div key={index} className="flex items-center gap-3 text-sm">
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              <div className="flex-1">
                                <span className="font-medium capitalize">{progress.stage}</span>
                                {progress.message && (
                                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                                    - {progress.message}
                                  </span>
                                )}
                              </div>
                              <span className="text-gray-400 text-xs">
                                {new Date(progress.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    {entry.metadata && (
                      <div>
                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('toolHistory.metadata', 'Metadata')}:
                        </h5>
                        <div className="text-sm space-y-1">
                          {entry.metadata.retryCount !== undefined && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Retries:</span>
                              <span className="ml-1">{entry.metadata.retryCount}</span>
                            </div>
                          )}
                          {entry.metadata.timeoutDuration && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Timeout:</span>
                              <span className="ml-1">{formatDuration(entry.metadata.timeoutDuration)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ToolExecutionHistory;