'use client';

import { useState } from 'react';
import { User, Bot, Copy, Check } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import MarkdownRenderer from './MarkdownRenderer';
import ReasoningSteps from './ReasoningSteps';
import ToolCallStatus from './ToolCallStatus';
import InlineToolCallConfirmation from './InlineToolCallConfirmation';
import { ToolCall, ToolCallResult } from '@/lib/tool-call-client';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  reasoningSteps?: string[];
  toolCalls?: ToolCall[];
  toolResults?: ToolCallResult[];
  toolStatus?: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  onRetryTools?: () => void;
  onConfirmToolCalls?: (toolCalls: ToolCall[]) => void;
  onCancelToolCalls?: () => void;
  onExecuteSingleTool?: (toolCall: ToolCall) => void;
  isWaitingForLLM?: boolean;
}

export default function ChatMessage({ 
  role, 
  content, 
  timestamp, 
  reasoningSteps, 
  toolCalls, 
  toolResults, 
  toolStatus, 
  onRetryTools,
  onConfirmToolCalls,
  onCancelToolCalls,
  onExecuteSingleTool,
  isWaitingForLLM
}: ChatMessageProps) {
  const { isDarkMode } = useTheme();
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // 构建完整的Markdown内容
      let markdownContent = content;
      
      // 如果有推理步骤，添加到内容中
      if (reasoningSteps && reasoningSteps.length > 0) {
        markdownContent += '\n\n## 推理过程\n\n';
        reasoningSteps.forEach((step, index) => {
          markdownContent += `${index + 1}. ${step}\n\n`;
        });
      }
      
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      
      // 2秒后重置状态
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  return (
    <div className={`flex gap-4 p-6 ${
      isUser 
        ? 'justify-end' 
        : 'justify-start'
    }`}>
      {!isUser && (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
        }`}>
          <Bot className="w-6 h-6 text-white" />
        </div>
      )}
      
      <div className={`max-w-[95%] rounded-xl p-4 ${
        isUser
          ? isDarkMode 
            ? 'bg-blue-600 text-white' 
            : 'bg-blue-500 text-white'
          : isDarkMode
            ? 'bg-gray-700 text-white'
            : 'bg-gray-100 text-gray-900'
      }`}>
        <div className="mb-1">
          <MarkdownRenderer content={content} />
          {!isUser && reasoningSteps && reasoningSteps.length > 0 && (
            <ReasoningSteps steps={reasoningSteps} />
          )}
          {!isUser && toolCalls && toolCalls.length > 0 && (
            <>
              {toolStatus === 'pending' && onConfirmToolCalls && onCancelToolCalls ? (
                <InlineToolCallConfirmation
                  toolCalls={toolCalls}
                  toolResults={toolResults}
                  onConfirm={onConfirmToolCalls}
                  onCancel={onCancelToolCalls}
                  onExecuteSingle={onExecuteSingleTool}
                  isWaitingForLLM={isWaitingForLLM}
                />
              ) : (
                <ToolCallStatus
                  toolCalls={toolCalls}
                  toolResults={toolResults}
                  toolStatus={toolStatus}
                  onRetry={onRetryTools}
                />
              )}
            </>
          )}
        </div>
        
        {/* Copy button for AI messages */}
        {!isUser && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-opacity-20 border-current">
            <div className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {timestamp.toLocaleTimeString()}
            </div>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                copied
                  ? isDarkMode 
                    ? 'bg-green-600 text-white' 
                    : 'bg-green-500 text-white'
                  : isDarkMode
                    ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title="Copy as Markdown"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  复制
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Timestamp for user messages */}
        {isUser && (
          <div className={`text-xs mt-2 ${
            isUser 
              ? 'text-blue-100' 
              : isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {timestamp.toLocaleTimeString()}
          </div>
        )}
      </div>

      {isUser && (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isDarkMode ? 'bg-gray-600' : 'bg-gray-500'
        }`}>
          <User className="w-6 h-6 text-white" />
        </div>
      )}
    </div>
  );
}
