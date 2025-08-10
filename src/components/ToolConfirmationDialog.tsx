import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Badge, Alert, Spinner } from './ui';
import { useAccessibility } from '../hooks/useAccessibility';
import type { ToolCall } from '../types';

export interface ToolConfirmationDialogProps {
  isOpen: boolean;
  toolCall: ToolCall | null;
  onConfirm: (toolCall: ToolCall) => void | Promise<void>;
  onCancel: () => void;
  isExecuting?: boolean;
  executionProgress?: {
    stage: 'validating' | 'connecting' | 'executing' | 'processing' | 'completed';
    message?: string;
    progress?: number; // 0-100
  };
  executionResult?: {
    success: boolean;
    result?: string;
    error?: string;
    executionTime?: number;
  };
}

const ToolConfirmationDialog: React.FC<ToolConfirmationDialogProps> = ({
  isOpen,
  toolCall,
  onConfirm,
  onCancel,
  isExecuting = false,
  executionProgress,
  executionResult,
}) => {
  const { t } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const { focus, keyboard } = useAccessibility();
  
  // Use focus trap for modal
  const modalRef = React.useRef<HTMLDivElement>(null);
  keyboard.useFocusTrap(modalRef, isOpen);
  focus.useFocusReturn(isOpen);

  // Show result when execution completes
  useEffect(() => {
    if (executionResult && (executionResult.success || executionResult.error)) {
      setShowResult(true);
      // Auto-hide result after 3 seconds if successful
      if (executionResult.success) {
        const timer = setTimeout(() => {
          setShowResult(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [executionResult]);

  // Reset states when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsConfirming(false);
      setShowResult(false);
    }
  }, [isOpen]);

  if (!toolCall) {
    return null;
  }

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(toolCall);
    } catch (error) {
      console.error('Tool execution failed:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    if (!isConfirming && !isExecuting) {
      onCancel();
    }
  };

  // Parse tool arguments for display
  let parsedArguments: Record<string, any> = {};
  let argumentsError: string | null = null;
  
  try {
    parsedArguments = JSON.parse(toolCall.function.arguments);
  } catch (error) {
    argumentsError = 'Invalid JSON format';
  }

  const formatParameterValue = (value: any): string => {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value, null, 2);
  };

  const renderSyntaxHighlightedValue = (value: any, type: string) => {
    if (type === 'string') {
      return (
        <span className="text-green-700 dark:text-green-300">
          "{value}"
        </span>
      );
    } else if (type === 'number') {
      return (
        <span className="text-blue-700 dark:text-blue-300">
          {value}
        </span>
      );
    } else if (type === 'boolean') {
      return (
        <span className="text-purple-700 dark:text-purple-300">
          {String(value)}
        </span>
      );
    } else if (type === 'null') {
      return (
        <span className="text-gray-500 dark:text-gray-400 italic">
          null
        </span>
      );
    } else {
      // For objects and arrays, use JSON syntax highlighting
      const jsonString = JSON.stringify(value, null, 2);
      return (
        <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {jsonString}
        </pre>
      );
    }
  };

  const validateParameters = (args: Record<string, any>): { isValid: boolean; warnings: string[] } => {
    const warnings: string[] = [];
    let isValid = true;

    // Check for potentially dangerous parameters
    Object.entries(args).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      const valueLower = typeof value === 'string' ? value.toLowerCase() : '';

      // Check for file system operations
      if (keyLower.includes('path') || keyLower.includes('file') || keyLower.includes('directory')) {
        if (typeof value === 'string') {
          if (value.includes('..') || value.startsWith('/') || value.includes('~')) {
            warnings.push(`Parameter "${key}" contains potentially unsafe path: ${value}`);
          }
        }
      }

      // Check for dangerous commands
      if (keyLower.includes('command') || keyLower.includes('exec') || keyLower.includes('run')) {
        if (typeof value === 'string') {
          const dangerousCommands = ['rm', 'del', 'format', 'sudo', 'chmod', 'chown'];
          if (dangerousCommands.some(cmd => valueLower.includes(cmd))) {
            warnings.push(`Parameter "${key}" contains potentially dangerous command: ${value}`);
          }
        }
      }

      // Check for empty required-looking parameters
      if (keyLower.includes('required') || keyLower.includes('mandatory')) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          warnings.push(`Parameter "${key}" appears to be required but is empty`);
          isValid = false;
        }
      }
    });

    return { isValid, warnings };
  };

  // Validate parameters
  const parameterValidation = validateParameters(parsedArguments);

  const getParameterType = (value: any): string => {
    if (Array.isArray(value)) {
      return 'array';
    }
    if (value === null) {
      return 'null';
    }
    if (typeof value === 'object') {
      return 'object';
    }
    return typeof value;
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'string':
        return 'text-green-600 dark:text-green-400';
      case 'number':
        return 'text-blue-600 dark:text-blue-400';
      case 'boolean':
        return 'text-purple-600 dark:text-purple-400';
      case 'array':
        return 'text-orange-600 dark:text-orange-400';
      case 'object':
        return 'text-red-600 dark:text-red-400';
      case 'null':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getProgressMessage = (stage: string): string => {
    switch (stage) {
      case 'validating':
        return t('chat.toolValidating', 'Validating parameters...');
      case 'connecting':
        return t('chat.toolConnecting', 'Connecting to MCP server...');
      case 'executing':
        return t('chat.toolExecutingStage', 'Executing tool...');
      case 'processing':
        return t('chat.toolProcessing', 'Processing results...');
      case 'completed':
        return t('chat.toolCompleted', 'Execution completed');
      default:
        return t('chat.toolWorking', 'Working...');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={t('chat.toolConfirmation')}
      size="lg"
      closeOnOverlayClick={!isConfirming && !isExecuting}
      closeOnEscape={!isConfirming && !isExecuting}
    >
      <div ref={modalRef}>
      <div className="space-y-6">
        {/* Warning Alert */}
        <Alert variant="warning" role="alert" aria-live="assertive">
          <div className="flex items-start gap-3">
            <svg 
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                {t('chat.confirmToolExecution', 'Confirm Tool Execution')}
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {t('chat.toolExecutionWarning', 'This tool will perform actions on your system. Please review the parameters carefully before proceeding.')}
              </p>
            </div>
          </div>
        </Alert>

        {/* Tool Information */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                {toolCall.function.name}
              </h3>
              <Badge variant="secondary" size="sm">
                Tool Function
              </Badge>
            </div>
          </div>

          {/* Tool Description and Server Info */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('chat.toolDescription', 'Tool Description')}
            </h4>
            <div className="bg-white dark:bg-gray-700 p-2 sm:p-3 rounded border space-y-2">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {/* TODO: This would come from the MCP server tool schema */}
                This tool will be executed with the parameters shown below. Please review carefully before proceeding.
              </p>
              
              {/* Server Information */}
              {toolCall.serverId && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v4a2 2 0 01-2 2H5z" />
                  </svg>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('chat.mcpServer', 'MCP Server')}: 
                    <Badge variant="secondary" size="sm" className="ml-1">
                      {toolCall.serverId}
                    </Badge>
                  </span>
                </div>
              )}
              
              {/* Security Notice for Dangerous Tools */}
              {toolCall.function.name.includes('delete') || 
               toolCall.function.name.includes('remove') || 
               toolCall.function.name.includes('destroy') ? (
                <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <svg className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-red-800 dark:text-red-200">
                      {t('chat.dangerousOperation', 'Potentially Destructive Operation')}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {t('chat.dangerousOperationWarning', 'This operation may modify or delete data. Please verify the parameters carefully.')}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Parameters */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('chat.toolParameters')}
          </h4>
          
          {argumentsError ? (
            <Alert variant="error">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">Parameter Parsing Error</span>
              </div>
              <p className="text-sm mt-1">{argumentsError}</p>
              <pre className="mt-2 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-x-auto">
                {toolCall.function.arguments}
              </pre>
            </Alert>
          ) : Object.keys(parsedArguments).length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No parameters provided
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
              {Object.entries(parsedArguments).map(([key, value], index) => {
                const type = getParameterType(value);
                const isLongValue = typeof value === 'string' && value.length > 100;
                
                return (
                  <div
                    key={key}
                    className={`p-4 ${
                      index !== Object.keys(parsedArguments).length - 1
                        ? 'border-b border-gray-200 dark:border-gray-600'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {key}
                        </span>
                        <Badge
                          variant="secondary"
                          size="sm"
                          className={getTypeColor(type)}
                        >
                          {type}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className={`${
                      isLongValue || type === 'object' || type === 'array'
                        ? 'bg-gray-50 dark:bg-gray-800 p-3 rounded border'
                        : 'bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded border inline-block'
                    }`}>
                      <div className={`text-sm ${
                        isLongValue ? 'max-h-32 overflow-y-auto' : ''
                      }`}>
                        {renderSyntaxHighlightedValue(value, type)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Parameter Validation Warnings */}
        {parameterValidation.warnings.length > 0 && (
          <Alert variant="warning" role="alert">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  {t('chat.parameterWarnings', 'Parameter Warnings')}
                </h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  {parameterValidation.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Alert>
        )}

        {/* Execution Progress */}
        {(isExecuting || isConfirming) && executionProgress && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Spinner size="sm" className="text-blue-600 dark:text-blue-400" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  {t('chat.toolExecuting', 'Executing Tool')}
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {getProgressMessage(executionProgress.stage)}
                </p>
              </div>
            </div>
            
            {/* Progress Bar */}
            {executionProgress.progress !== undefined && (
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(0, Math.min(100, executionProgress.progress))}%` }}
                  role="progressbar"
                  aria-valuenow={executionProgress.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Tool execution progress: ${executionProgress.progress}%`}
                />
              </div>
            )}
            
            {/* Custom Progress Message */}
            {executionProgress.message && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                {executionProgress.message}
              </p>
            )}
          </div>
        )}

        {/* Execution Result */}
        {showResult && executionResult && (
          <div className={`border rounded-lg p-4 ${
            executionResult.success 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                executionResult.success 
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {executionResult.success ? (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium mb-2 ${
                  executionResult.success 
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {executionResult.success 
                    ? t('chat.toolExecutionSuccess', 'Tool Executed Successfully')
                    : t('chat.toolExecutionFailed', 'Tool Execution Failed')
                  }
                </h4>
                
                {/* Execution Time */}
                {executionResult.executionTime && (
                  <p className={`text-xs mb-2 ${
                    executionResult.success 
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {t('chat.executionTime', 'Execution time')}: {executionResult.executionTime}ms
                  </p>
                )}
                
                {/* Result Content */}
                {(executionResult.result || executionResult.error) && (
                  <div className={`bg-white dark:bg-gray-700 border rounded p-3 ${
                    executionResult.success 
                      ? 'border-green-200 dark:border-green-700'
                      : 'border-red-200 dark:border-red-700'
                  }`}>
                    <pre className={`text-sm whitespace-pre-wrap max-h-32 overflow-y-auto ${
                      executionResult.success 
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {executionResult.result || executionResult.error}
                    </pre>
                  </div>
                )}
              </div>
              
              {/* Close Result Button */}
              <button
                onClick={() => setShowResult(false)}
                className={`p-1 rounded hover:bg-opacity-20 transition-colors ${
                  executionResult.success 
                    ? 'text-green-600 dark:text-green-400 hover:bg-green-600'
                    : 'text-red-600 dark:text-red-400 hover:bg-red-600'
                }`}
                aria-label={t('common.close', 'Close')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Raw JSON (collapsible) */}
        <details className="bg-gray-50 dark:bg-gray-800 rounded-lg">
          <summary className="p-3 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            View Raw JSON
          </summary>
          <div className="px-3 pb-3">
            <pre className="text-xs bg-white dark:bg-gray-700 p-3 rounded border overflow-x-auto">
              {JSON.stringify(toolCall, null, 2)}
            </pre>
          </div>
        </details>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Show different buttons based on execution state */}
          {showResult && executionResult ? (
            // Result state - show close button
            <Button
              onClick={() => {
                setShowResult(false);
                if (executionResult.success) {
                  onCancel(); // Close dialog on success
                }
              }}
              className="min-w-[100px]"
              aria-label={t('common.close', 'Close')}
            >
              {executionResult.success ? t('common.close', 'Close') : t('common.dismiss', 'Dismiss')}
            </Button>
          ) : (
            // Normal confirmation state
            <>
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={isConfirming || isExecuting}
                aria-label={t('chat.cancelToolExecution', 'Cancel tool execution')}
                shortcut="Esc"
              >
                {t('chat.cancelTool', 'Cancel')}
              </Button>
              
              <Button
                onClick={handleConfirm}
                disabled={isConfirming || isExecuting || !!argumentsError || !parameterValidation.isValid}
                className="min-w-[100px] sm:order-last"
                aria-label={t('chat.confirmToolExecution', 'Confirm and execute tool')}
                aria-describedby={argumentsError ? 'parameter-error' : undefined}
              >
                {isConfirming || isExecuting ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                    <span>
                      {executionProgress?.stage === 'validating' && t('chat.validating', 'Validating...')}
                      {executionProgress?.stage === 'connecting' && t('chat.connecting', 'Connecting...')}
                      {executionProgress?.stage === 'executing' && t('chat.executing', 'Executing...')}
                      {executionProgress?.stage === 'processing' && t('chat.processing', 'Processing...')}
                      {!executionProgress?.stage && t('chat.toolExecuting', 'Executing...')}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a2.5 2.5 0 110 5H9V10z" />
                    </svg>
                    <span>{t('chat.runTool', 'Run Tool')}</span>
                  </div>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
      </div>
    </Modal>
  );
};

export default ToolConfirmationDialog;