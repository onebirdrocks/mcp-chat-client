'use client';

import { useState } from 'react';
import { Play, Check, X, Clock, AlertTriangle, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { ToolCall, ToolCallResult } from '@/lib/tool-call-client';

interface ToolCallStatusProps {
  toolCalls?: ToolCall[];
  toolResults?: ToolCallResult[];
  toolStatus?: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  onRetry?: () => void;
}

export default function ToolCallStatus({ 
  toolCalls, 
  toolResults, 
  toolStatus, 
  onRetry 
}: ToolCallStatusProps) {
  const { isDarkMode } = useTheme();
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  const getStatusIcon = () => {
    switch (toolStatus) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'executing':
        return <Play className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (toolStatus) {
      case 'pending':
        return '等待用户确认';
      case 'executing':
        return '正在执行工具';
      case 'completed':
        return '工具执行完成';
      case 'failed':
        return '工具执行失败';
      case 'cancelled':
        return '工具执行已取消';
      default:
        return '未知状态';
    }
  };

  const getStatusColor = () => {
    switch (toolStatus) {
      case 'pending':
        return 'text-yellow-600';
      case 'executing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'cancelled':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBgColor = () => {
    switch (toolStatus) {
      case 'pending':
        return isDarkMode ? 'bg-yellow-900/20' : 'bg-yellow-50';
      case 'executing':
        return isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50';
      case 'completed':
        return isDarkMode ? 'bg-green-900/20' : 'bg-green-50';
      case 'failed':
        return isDarkMode ? 'bg-red-900/20' : 'bg-red-50';
      case 'cancelled':
        return isDarkMode ? 'bg-gray-900/20' : 'bg-gray-50';
      default:
        return isDarkMode ? 'bg-gray-900/20' : 'bg-gray-50';
    }
  };

  const getToolResult = (toolId: string) => {
    return toolResults?.find(result => result.toolCallId === toolId);
  };

  const toggleToolExpansion = (toolId: string) => {
    setExpandedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  };

  const formatArguments = (args: Record<string, any>): string => {
    try {
      return JSON.stringify(args, null, 2);
    } catch {
      return String(args);
    }
  };

  const formatResult = (result: any): string => {
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return String(result);
    }
  };

  const successCount = toolResults?.filter(r => r.success).length || 0;
  const totalCount = toolCalls.length;

  return (
    <div className={`mt-3 rounded-lg border ${getStatusBgColor()} ${
      isDarkMode ? 'border-gray-700' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-md ${
            isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
          }`}>
            {getStatusIcon()}
          </div>
          <div>
            <h3 className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </h3>
            <p className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {successCount}/{totalCount} 成功
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {toolStatus === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1.5 ${
                isDarkMode
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              <Play className="w-3 h-3" />
              重试
            </button>
          )}
        </div>
      </div>

      {/* Tools List */}
      <div className="p-3 space-y-2">
        {toolCalls.map((tool, index) => {
          const result = getToolResult(tool.id);
          const isSuccess = result?.success;
          const isExecuted = toolStatus === 'completed' || toolStatus === 'failed';
          const isExpanded = expandedTools.has(tool.id);
          
          return (
            <div
              key={tool.id}
              className={`rounded-md border transition-all ${
                isExecuted
                  ? isSuccess
                    ? isDarkMode
                      ? 'bg-green-900/20 border-green-600/50'
                      : 'bg-green-50 border-green-200'
                    : isDarkMode
                      ? 'bg-red-900/20 border-red-600/50'
                      : 'bg-red-50 border-red-200'
                  : isDarkMode
                    ? 'bg-gray-700/50 border-gray-600'
                    : 'bg-white border-gray-200'
              }`}
            >
              {/* Tool Header */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isExecuted
                      ? isSuccess
                        ? isDarkMode
                          ? 'bg-green-600 text-white'
                          : 'bg-green-500 text-white'
                        : isDarkMode
                          ? 'bg-red-600 text-white'
                          : 'bg-red-500 text-white'
                      : isDarkMode
                        ? 'bg-gray-600 text-gray-300'
                        : 'bg-gray-400 text-gray-600'
                  }`}>
                    {isExecuted ? (
                      isSuccess ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {tool.name}
                      </span>
                      {tool.serverName && (
                        <span className={`px-1.5 py-0.5 rounded text-xs flex-shrink-0 ${
                          isDarkMode 
                            ? 'bg-gray-600 text-gray-300' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {tool.serverName}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {isExecuted 
                        ? isSuccess ? '执行成功' : '执行失败'
                        : '等待执行'
                      }
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => toggleToolExpansion(tool.id)}
                  className={`p-1 rounded transition-colors ${
                    isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-400' 
                      : 'hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className={`px-3 pb-3 ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                } border-t`}>
                  <div className="pt-3 space-y-3">
                    {/* Parameters */}
                    <div>
                      <div className={`text-xs font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        参数
                      </div>
                      <pre className={`text-xs p-2 rounded overflow-auto ${
                        isDarkMode 
                          ? 'bg-gray-800 text-gray-300' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {formatArguments(tool.arguments)}
                      </pre>
                    </div>
                    
                    {/* Results */}
                    {isExecuted && result && (
                      <div>
                        <div className={`text-xs font-medium mb-2 ${
                          isSuccess
                            ? isDarkMode ? 'text-green-400' : 'text-green-700'
                            : isDarkMode ? 'text-red-400' : 'text-red-700'
                        }`}>
                          {isSuccess ? '结果' : '错误'}
                        </div>
                        <pre className={`text-xs p-2 rounded overflow-auto ${
                          isSuccess
                            ? isDarkMode 
                              ? 'bg-green-900/20 text-green-300 border border-green-700/50'
                              : 'bg-green-50 text-green-700 border border-green-200'
                            : isDarkMode 
                              ? 'bg-red-900/20 text-red-300 border border-red-700/50'
                              : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {isSuccess ? formatResult(result.result) : result.error}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
