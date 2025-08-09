import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';
import { useEnhancedAccessibility } from '../hooks/useEnhancedAccessibility';

export interface MessageInputProps {
  onSendMessage: (message: string) => void | Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isLoading = false,
  disabled = false,
  placeholder,
  maxLength = 4000,
  className = '',
}) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { screenReaderUtils, ariaUtils } = useEnhancedAccessibility();

  // Focus the textarea when component mounts
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height based on scrollHeight, with min and max constraints
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading || isSending || disabled) {
      return;
    }

    setIsSending(true);
    screenReaderUtils.announceLoading(true, 'Message');
    
    try {
      await onSendMessage(trimmedMessage);
      setMessage('');
      screenReaderUtils.announceSuccess('Message sent', 'Chat');
      
      // Focus back to textarea after sending
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    } catch (error) {
      console.error('Failed to send message:', error);
      screenReaderUtils.announceError('Failed to send message', 'Chat');
    } finally {
      setIsSending(false);
      screenReaderUtils.announceLoading(false, 'Message');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (but not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    
    // Handle Escape key to clear input
    if (e.key === 'Escape') {
      setMessage('');
      textareaRef.current?.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const currentLength = message.length;
    const selectionLength = textareaRef.current?.selectionEnd! - textareaRef.current?.selectionStart!;
    const availableSpace = maxLength - currentLength + selectionLength;
    
    if (pastedText.length > availableSpace) {
      e.preventDefault();
      const truncatedText = pastedText.substring(0, availableSpace);
      const textarea = textareaRef.current!;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = message.substring(0, start) + truncatedText + message.substring(end);
      setMessage(newValue);
      
      // Set cursor position after the pasted text
      setTimeout(() => {
        textarea.setSelectionRange(start + truncatedText.length, start + truncatedText.length);
      }, 0);
    }
  };

  const isDisabled = disabled || isLoading || isSending;
  const canSend = message.trim().length > 0 && !isDisabled;
  const characterCount = message.length;
  const isNearLimit = characterCount > maxLength * 0.8;

  return (
    <div className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0 z-10 ${className}`}>
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-2 sm:space-x-3">
            {/* Message input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                id="message-input"
                value={message}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={placeholder || t('chat.messagePlaceholder')}
                disabled={isDisabled}
                rows={1}
                aria-label={t('chat.messageInputLabel', 'Type your message')}
                aria-describedby="message-input-help"
                aria-invalid={characterCount >= maxLength ? 'true' : 'false'}
                className={`
                  w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 
                  bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white
                  placeholder-gray-500 dark:placeholder-gray-400
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20
                  disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
                  transition-colors duration-200
                  ${isNearLimit ? 'border-yellow-400 dark:border-yellow-500' : ''}
                  ${characterCount >= maxLength ? 'border-red-400 dark:border-red-500' : ''}
                `}
                style={{
                  minHeight: '44px',
                  maxHeight: '200px',
                  lineHeight: '1.5',
                }}
              />
              
              {/* Character count */}
              {(isNearLimit || characterCount >= maxLength) && (
                <div className={`absolute bottom-1 right-2 text-xs ${
                  characterCount >= maxLength 
                    ? 'text-red-500 dark:text-red-400' 
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {characterCount}/{maxLength}
                </div>
              )}
            </div>

            {/* Send button */}
            <Button
              onClick={handleSendMessage}
              disabled={!canSend}
              className="px-3 sm:px-4 py-3 h-11 flex-shrink-0 min-w-[60px] sm:min-w-[80px]"
              aria-label={t('chat.sendMessage')}
              shortcut="Enter"
              tooltip={t('chat.sendMessageTooltip', 'Send message (Enter)')}
            >
              {isSending || isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="hidden sm:inline text-sm">
                    {t('common.loading')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span className="hidden sm:inline">
                    {t('chat.sendMessage')}
                  </span>
                </div>
              )}
            </Button>
          </div>
          
          {/* Helper text */}
          <div 
            id="message-input-help" 
            className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500 dark:text-gray-400"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="hidden sm:inline">
                Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Enter</kbd> to send, 
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs ml-1">Shift+Enter</kbd> for new line
              </span>
              <span className="sm:hidden">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Enter</kbd> to send
              </span>
              <span className="hidden sm:inline">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd> to clear
              </span>
            </div>
            
            {/* Word count */}
            {message.trim().length > 0 && (
              <span className="text-gray-400 dark:text-gray-500 text-right" aria-live="polite">
                {message.trim().split(/\s+/).length} word{message.trim().split(/\s+/).length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;