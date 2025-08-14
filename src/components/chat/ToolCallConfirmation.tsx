'use client';

import { useState } from 'react';
import { Check, X, Play, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  serverName?: string;
}

interface ToolCallConfirmationProps {
  toolCalls: ToolCall[];
  onConfirm: (toolCalls: ToolCall[]) => void;
  onCancel: () => void;
  isVisible: boolean;
}

export default function ToolCallConfirmation({ 
  toolCalls, 
  onConfirm, 
  onCancel, 
  isVisible 
}: ToolCallConfirmationProps) {
  const { isDarkMode } = useTheme();
  const [confirmedTools, setConfirmedTools] = useState<Set<string>>(new Set());

  if (!isVisible || toolCalls.length === 0) {
    return null;
  }

  const handleToolToggle = (toolId: string) => {
    const newConfirmed = new Set(confirmedTools);
    if (newConfirmed.has(toolId)) {
      newConfirmed.delete(toolId);
    } else {
      newConfirmed.add(toolId);
    }
    setConfirmedTools(newConfirmed);
  };

  const handleConfirm = () => {
    const selectedTools = toolCalls.filter(tool => confirmedTools.has(tool.id));
    onConfirm(selectedTools);
    setConfirmedTools(new Set());
  };

  const handleCancel = () => {
    onCancel();
    setConfirmedTools(new Set());
  };

  const handleSelectAll = () => {
    setConfirmedTools(new Set(toolCalls.map(tool => tool.id)));
  };

  const handleSelectNone = () => {
    setConfirmedTools(new Set());
  };

  const formatArguments = (args: Record<string, any>): string => {
    try {
      return JSON.stringify(args, null, 2);
    } catch {
      return String(args);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-2xl max-h-[80vh] rounded-lg shadow-xl ${
        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isDarkMode ? 'bg-yellow-600' : 'bg-yellow-100'
            }`}>
              <AlertTriangle className={`w-5 h-5 ${
                isDarkMode ? 'text-white' : 'text-yellow-800'
              }`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">工具调用确认</h2>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                AI 请求执行以下工具，请确认是否允许
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <div className="space-y-4">
            {toolCalls.map((tool) => (
              <div key={tool.id} className={`border rounded-lg p-4 ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={confirmedTools.has(tool.id)}
                    onChange={() => handleToolToggle(tool.id)}
                    className="mt-1 w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Play className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{tool.name}</span>
                      {tool.serverName && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          {tool.serverName}
                        </span>
                      )}
                    </div>
                    <div className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      <strong>参数:</strong>
                    </div>
                    <pre className={`mt-1 p-2 rounded text-xs overflow-x-auto ${
                      isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-800'
                    }`}>
                      {formatArguments(tool.arguments)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selection Controls */}
        <div className={`px-6 py-3 border-t ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                全选
              </button>
              <button
                onClick={handleSelectNone}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                全不选
              </button>
            </div>
            <div className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              已选择 {confirmedTools.size} / {toolCalls.length} 个工具
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between p-6 border-t ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            请仔细检查工具调用的参数，确认无误后再执行
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                isDarkMode 
                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              <X className="w-4 h-4" />
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirmedTools.size === 0}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                confirmedTools.size > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : isDarkMode
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              确认执行 ({confirmedTools.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
