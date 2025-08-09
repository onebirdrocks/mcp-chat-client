import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Badge, Alert } from './ui';
import { useModalAccessibility } from '../hooks/useEnhancedAccessibility';
import type { ToolCall } from '../types';

export interface ToolConfirmationDialogProps {
  isOpen: boolean;
  toolCall: ToolCall | null;
  onConfirm: (toolCall: ToolCall) => void | Promise<void>;
  onCancel: () => void;
  isExecuting?: boolean;
}

const ToolConfirmationDialog: React.FC<ToolConfirmationDialogProps> = ({
  isOpen,
  toolCall,
  onConfirm,
  onCancel,
  isExecuting = false,
}) => {
  const { t } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);
  const { modalRef } = useModalAccessibility(isOpen);

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

          {/* Tool Description (if available) */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('chat.toolDescription')}
            </h4>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 p-2 sm:p-3 rounded border">
              {/* TODO: This would come from the MCP server tool schema */}
              This tool will be executed with the parameters shown below. Please review carefully before proceeding.
            </p>
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
                      <pre className={`text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap ${
                        isLongValue ? 'max-h-32 overflow-y-auto' : ''
                      }`}>
                        {formatParameterValue(value)}
                      </pre>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
            disabled={isConfirming || isExecuting || !!argumentsError}
            className="min-w-[100px] sm:order-last"
            aria-label={t('chat.confirmToolExecution', 'Confirm and execute tool')}
            aria-describedby={argumentsError ? 'parameter-error' : undefined}
          >
            {isConfirming || isExecuting ? (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{t('chat.toolExecuting')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a2.5 2.5 0 110 5H9V10z" />
                </svg>
                <span>{t('chat.runTool')}</span>
              </div>
            )}
          </Button>
        </div>
      </div>
      </div>
    </Modal>
  );
};

export default ToolConfirmationDialog;