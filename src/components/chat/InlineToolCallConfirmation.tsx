'use client';

import { useState, useEffect } from 'react';
import { Check, X, Play, AlertTriangle, ChevronDown, ChevronUp, Clock, Zap, SkipForward } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { ToolCall, ToolCallResult } from '@/lib/tool-call-client-simplified';

interface InlineToolCallConfirmationProps {
  toolCalls: ToolCall[];
  toolResults?: ToolCallResult[];
  onConfirm: (toolCalls: ToolCall[], sendToLLM?: boolean) => void;
  onCancel: () => void;
  onExecuteSingle?: (toolCall: ToolCall) => void;
  isWaitingForLLM?: boolean;
}

export default function InlineToolCallConfirmation({ 
  toolCalls, 
  toolResults,
  onConfirm, 
  onCancel,
  onExecuteSingle,
  isWaitingForLLM = false
}: InlineToolCallConfirmationProps) {
  const { isDarkMode } = useTheme();
  const [currentToolIndex, setCurrentToolIndex] = useState(0);
  const [executedTools, setExecutedTools] = useState<Set<string>>(new Set());
  const [executingTools, setExecutingTools] = useState<Set<string>>(new Set());
  const [skippedTools, setSkippedTools] = useState<Set<string>>(new Set());
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [autoCompleteEnabled, setAutoCompleteEnabled] = useState(true);

  // 根据工具执行结果更新已执行工具状态
  useEffect(() => {
    if (toolResults && toolResults.length > 0) {
      const executedIds = new Set(toolResults.map(result => result.toolCallId));
      console.log('🔧 Updating executed tools from toolResults:', Array.from(executedIds));
      setExecutedTools(prev => {
        const newSet = new Set([...prev, ...executedIds]);
        console.log('🔧 New executed tools set:', Array.from(newSet));
        return newSet;
      });
      
      // 从正在执行的工具中移除已完成的工具
      setExecutingTools(prev => {
        const newSet = new Set(prev);
        executedIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  }, [toolResults]);

  // 当所有工具都有结果时，确保所有工具都被标记为已执行
  useEffect(() => {
    if (toolResults && toolResults.length === toolCalls.length) {
      const allToolIds = new Set(toolCalls.map(tool => tool.id));
      setExecutedTools(allToolIds);
      console.log('🔧 所有工具都有结果，设置所有工具为已执行:', {
        toolResultsLength: toolResults.length,
        toolCallsLength: toolCalls.length,
        allToolIds: Array.from(allToolIds)
      });
    }
  }, [toolResults, toolCalls]);

  // 监听 isWaitingForLLM 的变化
  useEffect(() => {
    console.log('🔄 InlineToolCallConfirmation: isWaitingForLLM 变化为:', isWaitingForLLM);
  }, [isWaitingForLLM]);

  // 自动完成逻辑：当所有工具都执行完成或跳过时，自动调用完成回调
  useEffect(() => {
    // 计算已完成的工具数量（包括执行成功和跳过的）
    const completedToolsCount = executedTools.size + skippedTools.size;
    const totalToolsCount = toolCalls.length;
    
    console.log('🔧 自动完成检查:', {
      executedToolsSize: executedTools.size,
      skippedToolsSize: skippedTools.size,
      completedToolsCount,
      totalToolsCount,
      autoCompleteEnabled,
      executedTools: Array.from(executedTools),
      skippedTools: Array.from(skippedTools)
    });
    
    if (autoCompleteEnabled && completedToolsCount === totalToolsCount && totalToolsCount > 0) {
      console.log('🚀 自动完成触发:', {
        executedToolsSize: executedTools.size,
        skippedToolsSize: skippedTools.size,
        completedToolsCount,
        totalToolsCount,
        autoCompleteEnabled
      });
      
      // 延迟一点时间让用户看到执行完成的状态
      const timer = setTimeout(() => {
        console.log('🚀 执行自动完成回调 - 不发送给LLM');
        onConfirm(toolCalls, false); // 自动完成时不发送给LLM
      }, 1000); // 增加延迟时间，让用户看到"执行成功"状态
      
      return () => clearTimeout(timer);
    }
  }, [executedTools.size, skippedTools.size, toolCalls.length, autoCompleteEnabled, onConfirm, toolCalls]);

  const handleExecuteCurrent = () => {
    const currentTool = toolCalls[currentToolIndex];
    if (currentTool && onExecuteSingle) {
      // 设置工具为正在执行状态
      setExecutingTools(prev => new Set(prev).add(currentTool.id));
      onExecuteSingle(currentTool);
      // 注意：这里不再立即设置工具为已执行，而是等待实际的执行结果
    }
  };

  const handleExecuteNext = () => {
    if (currentToolIndex < toolCalls.length - 1) {
      setCurrentToolIndex(currentToolIndex + 1);
    } else {
      // 所有工具都执行完毕，调用完成回调
      onConfirm(toolCalls);
    }
  };

  const handleSkipCurrent = () => {
    const currentTool = toolCalls[currentToolIndex];
    if (currentTool) {
      // 将当前工具标记为跳过
      setSkippedTools(prev => new Set(prev).add(currentTool.id));
      // 同时标记为已执行，这样就不会再显示为等待状态
      setExecutedTools(prev => new Set(prev).add(currentTool.id));
    }
    
    if (currentToolIndex < toolCalls.length - 1) {
      setCurrentToolIndex(currentToolIndex + 1);
    } else {
      // 所有工具都跳过，调用完成回调
      onConfirm(toolCalls);
    }
  };

  const handleCancel = () => {
    onCancel();
    setCurrentToolIndex(0);
    setExecutedTools(new Set());
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

  const formatArguments = (args: Record<string, unknown>): string => {
    try {
      console.log('🔧 Formatting arguments:', args);
      if (!args || typeof args !== 'object') {
        return String(args || 'No arguments');
      }
      
      // 检查是否为空对象
      if (Object.keys(args).length === 0) {
        return 'No arguments';
      }
      
      return JSON.stringify(args, null, 2);
    } catch (error) {
      console.error('🔧 Error formatting arguments:', error);
      return String(args || 'Error formatting arguments');
    }
  };

  const currentTool = toolCalls[currentToolIndex];
  const executedCount = executedTools.size + skippedTools.size; // 包括跳过的工具
  const totalCount = toolCalls.length;
  const isLastTool = currentToolIndex === toolCalls.length - 1;
  const allToolsExecuted = executedCount === totalCount;

  // 获取工具的执行结果
  const getToolResult = (toolId: string) => {
    return toolResults?.find(result => result.toolCallId === toolId);
  };

  // 获取所有涉及的服务器
  const getInvolvedServers = () => {
    const servers = new Set<string>();
    toolCalls.forEach(tool => {
      if (tool.serverName) {
        servers.add(tool.serverName);
      }
    });
    return Array.from(servers);
  };

  const involvedServers = getInvolvedServers();

  return (
    <div className={`mt-4 rounded-lg border w-full ${
      isDarkMode 
        ? 'bg-gray-800/50 border-gray-700' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 ${
        isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50/50'
      } border-b rounded-t-lg`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isDarkMode ? 'bg-blue-600/20 border border-blue-600/30' : 'bg-blue-100 border border-blue-200'
          }`}>
            <Zap className={`w-4 h-4 ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`} />
          </div>
          <div>
            <h3 className={`font-semibold text-sm ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              工具执行
            </h3>
            {/* 显示涉及的服务器 */}
            {involvedServers.length > 0 && (
              <div className="flex items-center gap-1 mt-1 mb-2">
                <span className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  服务器:
                </span>
                {involvedServers.map((server, index) => (
                  <span key={server} className={`text-xs px-2 py-0.5 rounded ${
                    isDarkMode 
                      ? 'bg-gray-700 text-gray-300' 
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {server}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                executedCount === totalCount
                  ? isDarkMode 
                    ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                    : 'bg-green-100 text-green-700 border border-green-200'
                  : isDarkMode
                    ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
                    : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
              }`}>
                <span>{executedCount}/{totalCount}</span>
                <span>{executedCount === totalCount ? '已完成' : '进行中'}</span>
              </div>
              {isWaitingForLLM && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  isDarkMode 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                }`}>
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                  <span>AI处理中</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <label className={`flex items-center gap-2 text-xs ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <input
              type="checkbox"
              checked={autoCompleteEnabled}
              onChange={(e) => setAutoCompleteEnabled(e.target.checked)}
              className="w-3 h-3 rounded"
            />
            自动完成
          </label>
          <button
            onClick={handleCancel}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              isDarkMode
                ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            取消
          </button>
        </div>
      </div>

      {/* Tools List */}
      <div className="p-4 space-y-3">
        {toolCalls.map((tool, index) => {
          // 调试工具结构
          console.log(`🔧 Tool ${index} structure:`, tool);
          const isCurrent = index === currentToolIndex;
          const isExecuted = executedTools.has(tool.id);
          const isExecuting = executingTools.has(tool.id);
          const isSkipped = skippedTools.has(tool.id);
          const isExpanded = expandedTools.has(tool.id);
          const toolResult = getToolResult(tool.id);
          const isSuccess = toolResult?.success;
          const allToolsCompleted = (executedTools.size + skippedTools.size) === toolCalls.length;
          
          // 调试信息
          const statusText = isExecuting ? '正在执行' : 
            isCurrent && !allToolsCompleted ? '等待确认执行' : 
            isSkipped ? '跳过执行' :
            isExecuted && !isSkipped ? (
              isWaitingForLLM ? 
                (isSuccess ? '执行成功，等待AI处理' : '执行失败，等待AI处理') :
                (isSuccess ? '执行成功' : '执行失败')
            ) : allToolsCompleted && !isSkipped ? (
              isWaitingForLLM ? '执行成功，等待AI处理' : '执行成功'
            ) : '等待执行';
          
          console.log(`🔍 工具 ${index + 1} (${tool.name}) 状态:`, {
            isCurrent,
            isExecuted,
            isExecuting,
            isSkipped,
            isSuccess,
            allToolsCompleted,
            executedToolsSize: executedTools.size,
            toolCallsLength: toolCalls.length,
            isWaitingForLLM,
            statusText,
            toolResult: toolResult
          });
          console.log(`📝 工具 ${index + 1} statusText: "${statusText}"`);
          console.log(`🔍 工具 ${index + 1} isWaitingForLLM: ${isWaitingForLLM}`);
          

          
          return (
            <div
              key={tool.id || `tool-${index}`}
              className={`rounded-lg border transition-all duration-200 ${
                isExecuting
                  ? isDarkMode
                    ? 'bg-blue-900/20 border-blue-600/50 shadow-lg shadow-blue-600/10'
                    : 'bg-blue-50 border-blue-200 shadow-lg shadow-blue-200/50'
                  : isCurrent && !allToolsCompleted
                  ? isDarkMode
                    ? 'bg-yellow-900/20 border-yellow-600/50 shadow-lg shadow-yellow-600/10'
                    : 'bg-yellow-50 border-yellow-200 shadow-lg shadow-yellow-200/50'
                  : isSkipped
                  ? isDarkMode
                    ? 'bg-gray-800/20 border-gray-600/50 shadow-lg shadow-gray-600/10'
                    : 'bg-gray-100 border-gray-300 shadow-lg shadow-gray-300/50'
                  : (isExecuted || allToolsCompleted) && !isSkipped
                  ? isSuccess
                    ? isDarkMode
                      ? 'bg-green-900/20 border-green-600/50 shadow-lg shadow-green-600/10'
                      : 'bg-green-50 border-green-200 shadow-lg shadow-green-200/50'
                    : isDarkMode
                      ? 'bg-red-900/20 border-red-600/50 shadow-lg shadow-red-600/10'
                      : 'bg-red-50 border-red-200 shadow-lg shadow-red-200/50'
                  : isDarkMode
                    ? 'bg-gray-700/50 border-gray-600'
                    : 'bg-white border-gray-200'
              }`}
            >
              {/* Tool Header */}
              <div className="flex items-start justify-between p-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isExecuting
                      ? isDarkMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : isCurrent && !allToolsCompleted
                      ? isDarkMode
                        ? 'bg-yellow-600 text-white'
                        : 'bg-yellow-500 text-white'
                      : isSkipped
                      ? isDarkMode
                        ? 'bg-gray-600 text-gray-300'
                        : 'bg-gray-500 text-gray-600'
                      : (isExecuted || allToolsCompleted) && !isSkipped
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
                    {isExecuting ? (
                      <Clock className="w-3 h-3" />
                    ) : isCurrent && !allToolsCompleted ? (
                      <Play className="w-3 h-3" />
                    ) : isSkipped ? (
                      <SkipForward className="w-3 h-3" />
                    ) : (isExecuted || allToolsCompleted) && !isSkipped ? (
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
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {tool.toolName}
                          </span>
                          {tool.serverName && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              isDarkMode 
                                ? 'bg-gray-700 text-gray-400' 
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {tool.serverName}
                            </span>
                          )}
                        </div>
                        <div className={`text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {isExecuting ? '正在执行' : 
                           isSkipped ? '已跳过' :
                           isExecuted ? (
                             isSuccess ? '执行成功' : '执行失败'
                           ) : '等待执行'}
                        </div>
                      </div>
                      
                      {/* 工具级别的运行和跳过按钮 */}
                      {!isExecuted && !isExecuting && !isSkipped && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSkippedTools(prev => new Set(prev).add(tool.id));
                              setExecutedTools(prev => new Set(prev).add(tool.id));
                            }}
                            className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                              isDarkMode
                                ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300 border border-gray-600'
                                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800 border border-gray-300'
                            }`}
                          >
                            <SkipForward className="w-3 h-3" />
                            跳过
                          </button>
                          <button
                            onClick={async () => {
                              if (onExecuteSingle) {
                                console.log(`🔧 Executing tool: ${tool.toolName} (${tool.id})`);
                                setExecutingTools(prev => new Set(prev).add(tool.id));
                                try {
                                  await onExecuteSingle(tool);
                                  // 工具执行完成后，标记为已执行
                                  console.log(`🔧 Tool execution completed: ${tool.id}`);
                                  setExecutedTools(prev => {
                                    const newSet = new Set(prev).add(tool.id);
                                    console.log('🔧 Updated executed tools:', Array.from(newSet));
                                    return newSet;
                                  });
                                  setExecutingTools(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(tool.id);
                                    return newSet;
                                  });
                                } catch (error) {
                                  console.error('Tool execution failed:', error);
                                  // 即使失败也标记为已执行（已处理）
                                  setExecutedTools(prev => {
                                    const newSet = new Set(prev).add(tool.id);
                                    console.log('🔧 Updated executed tools (after error):', Array.from(newSet));
                                    return newSet;
                                  });
                                  setExecutingTools(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(tool.id);
                                    return newSet;
                                  });
                                }
                              }
                            }}
                            className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                              isDarkMode
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                          >
                            <Play className="w-3 h-3" />
                            运行
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleToolExpansion(tool.id)}
                    className={`p-1 rounded transition-colors ${
                      isDarkMode 
                        ? 'hover:bg-gray-700 text-gray-400' 
                        : 'hover:bg-gray-200 text-gray-600'
                    }`}
                    title={isExpanded ? '收起详情' : '展开详情'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className={`px-3 pb-3 ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                } border-t`}>
                  <div className="pt-3">
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
                      {(() => {
                        const args = tool.input || tool.args || tool.arguments;
                        console.log(`🔧 Tool ${tool.toolName} arguments:`, args);
                        return formatArguments(args || {});
                      })()}
                    </pre>
                    
                    {/* 显示执行结果 */}
                    {isExecuted && toolResult && (
                      <div className="mt-3">
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
                          {isSuccess ? JSON.stringify(toolResult.result, null, 2) : toolResult.error}
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

      {/* Actions */}
      <div className={`flex items-center justify-between p-4 ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      } border-t`}>
        <div className="flex items-center gap-2">
          {/* 执行所有工具按钮 */}
          {executedCount < totalCount && (
            <button
              onClick={async () => {
                // 执行所有未执行的工具
                const toolsToExecute = toolCalls.filter(tool => 
                  !executedTools.has(tool.id) && !executingTools.has(tool.id)
                );
                
                if (onExecuteSingle) {
                  // 标记所有工具为正在执行
                  setExecutingTools(prev => {
                    const newSet = new Set(prev);
                    toolsToExecute.forEach(tool => newSet.add(tool.id));
                    return newSet;
                  });
                  
                  // 并行执行所有工具
                  const executionPromises = toolsToExecute.map(async (tool) => {
                    try {
                      await onExecuteSingle(tool);
                      return { toolId: tool.id, success: true };
                    } catch (error) {
                      console.error(`Tool ${tool.toolName} execution failed:`, error);
                      return { toolId: tool.id, success: false };
                    }
                  });
                  
                  // 等待所有工具执行完成
                  const results = await Promise.all(executionPromises);
                  
                  // 更新状态
                  setExecutedTools(prev => {
                    const newSet = new Set(prev);
                    results.forEach(result => newSet.add(result.toolId));
                    return newSet;
                  });
                  
                  setExecutingTools(prev => {
                    const newSet = new Set(prev);
                    results.forEach(result => newSet.delete(result.toolId));
                    return newSet;
                  });
                }
              }}
              disabled={executingTools.size > 0}
              className={`px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-2 font-medium ${
                executingTools.size > 0
                  ? isDarkMode
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : isDarkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <Play className="w-4 h-4" />
              {executingTools.size > 0 ? '执行中...' : '执行所有工具'}
            </button>
          )}
          
          {/* 跳过所有工具按钮 */}
          {executedCount < totalCount && (
            <button
              onClick={() => {
                // 跳过所有未执行的工具
                toolCalls.forEach(tool => {
                  if (!executedTools.has(tool.id) && !executingTools.has(tool.id)) {
                    setSkippedTools(prev => new Set(prev).add(tool.id));
                    setExecutedTools(prev => new Set(prev).add(tool.id));
                  }
                });
              }}
              disabled={executingTools.size > 0}
              className={`px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                executingTools.size > 0
                  ? isDarkMode
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : isDarkMode
                    ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300 border border-gray-600'
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800 border border-gray-300'
              }`}
            >
              <SkipForward className="w-4 h-4" />
              跳过所有
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* 取消按钮 */}
          <button
            onClick={handleCancel}
            className={`px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-2 font-medium ${
              isDarkMode
                ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300 border border-gray-600'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800 border border-gray-300'
            }`}
          >
            <X className="w-4 h-4" />
            取消
          </button>
          
          {/* 确定按钮 */}
          <button
            onClick={() => onConfirm(toolCalls, true)} // 手动确定时发送给LLM
            disabled={executedCount === 0}
            className={`px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-2 font-medium ${
              executedCount === 0
                ? isDarkMode
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : isDarkMode
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            <Check className="w-4 h-4" />
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
