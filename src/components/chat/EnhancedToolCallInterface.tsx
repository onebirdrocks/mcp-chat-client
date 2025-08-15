'use client';

import { useState, useEffect } from 'react';
import { Send, Settings, Zap, AlertCircle } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import LLMProviderSelector from './LLMProviderSelector';
import ModelSelector from './ModelSelector';
import InlineToolCallConfirmation from './InlineToolCallConfirmation';
import { ToolCall, ToolCallResult } from '@/lib/tool-call-client-simplified';
import { simplifiedToolCallClient } from '@/lib/tool-call-client-simplified';

interface EnhancedToolCallInterfaceProps {
  onSendMessage: (message: string, providerId: string, modelId: string) => void;
  onToolCallsConfirmed: (toolCalls: ToolCall[]) => void;
  onToolCallsCancelled: () => void;
  onSingleToolExecuted: (toolCall: ToolCall) => void;
  toolCalls?: ToolCall[];
  toolResults?: ToolCallResult[];
  toolStatus?: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  isWaitingForLLM?: boolean;
  className?: string;
}

export default function EnhancedToolCallInterface({
  onSendMessage,
  onToolCallsConfirmed,
  onToolCallsCancelled,
  onSingleToolExecuted,
  toolCalls,
  toolResults,
  toolStatus,
  isWaitingForLLM,
  className = ''
}: EnhancedToolCallInterfaceProps) {
  const { isDarkMode } = useTheme();
  const [message, setMessage] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 加载可用的MCP工具
  useEffect(() => {
    const loadTools = async () => {
      setIsLoadingTools(true);
      try {
        const tools = await simplifiedToolCallClient.getAllAvailableTools();
        setAvailableTools(tools);
      } catch (error) {
        console.error('Failed to load tools:', error);
      } finally {
        setIsLoadingTools(false);
      }
    };

    loadTools();
  }, []);

  const handleSendMessage = () => {
    if (!message.trim() || !selectedProvider || !selectedModel) {
      return;
    }

    onSendMessage(message.trim(), selectedProvider, selectedModel);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const canSendMessage = message.trim() && selectedProvider && selectedModel;

  return (
    <div className={`${className}`}>
      {/* 设置面板 */}
      {showSettings && (
        <div className={`mb-4 p-4 rounded-lg border ${
          isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              模型设置
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className={`p-1 rounded ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                LLM Provider
              </label>
              <LLMProviderSelector
                selectedProvider={selectedProvider}
                onProviderChange={setSelectedProvider}
              />
            </div>
            
            <div>
              <label className={`block text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                模型
              </label>
              <ModelSelector
                selectedProvider={selectedProvider}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
            </div>
          </div>

          {/* 可用工具信息 */}
          <div className="mt-3">
            <div className={`flex items-center gap-2 text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <Zap className="w-3 h-3" />
              {isLoadingTools ? (
                '加载工具中...'
              ) : (
                `可用MCP工具: ${availableTools.length} 个`
              )}
            </div>
            {availableTools.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {availableTools.slice(0, 5).map((tool, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 text-xs rounded ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-300' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {tool.name}
                  </span>
                ))}
                {availableTools.length > 5 && (
                  <span className={`px-2 py-1 text-xs rounded ${
                    isDarkMode 
                      ? 'bg-gray-700 text-gray-300' 
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    +{availableTools.length - 5} 更多
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 工具调用确认界面 */}
      {toolCalls && toolCalls.length > 0 && (
        <div className="mb-4">
          <InlineToolCallConfirmation
            toolCalls={toolCalls}
            toolResults={toolResults}
            onConfirm={onToolCallsConfirmed}
            onCancel={onToolCallsCancelled}
            onExecuteSingle={onSingleToolExecuted}
            isWaitingForLLM={isWaitingForLLM}
          />
        </div>
      )}

      {/* 消息输入区域 */}
      <div className={`flex items-end gap-2 p-4 border-t ${
        isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
      }`}>
        {/* 设置按钮 */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${
            showSettings
              ? isDarkMode
                ? 'bg-blue-600 text-white'
                : 'bg-blue-500 text-white'
              : isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="模型设置"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* 消息输入框 */}
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              !selectedProvider || !selectedModel
                ? "请先选择LLM Provider和模型..."
                : "输入你的消息，模型将自动选择合适的MCP工具..."
            }
            className={`w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
        </div>

        {/* 发送按钮 */}
        <button
          onClick={handleSendMessage}
          disabled={!canSendMessage || isWaitingForLLM}
          className={`p-2 rounded-lg transition-colors ${
            canSendMessage && !isWaitingForLLM
              ? isDarkMode
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-500 text-white hover:bg-blue-600'
              : isDarkMode
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          title={
            !selectedProvider || !selectedModel
              ? "请先选择LLM Provider和模型"
              : "发送消息"
          }
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* 状态提示 */}
      {(!selectedProvider || !selectedModel) && (
        <div className={`px-4 py-2 text-sm ${
          isDarkMode ? 'bg-yellow-900/20 text-yellow-300' : 'bg-yellow-50 text-yellow-800'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>
              {!selectedProvider && !selectedModel
                ? "请先选择LLM Provider和模型以开始对话"
                : !selectedProvider
                ? "请先选择LLM Provider"
                : "请先选择模型"
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
