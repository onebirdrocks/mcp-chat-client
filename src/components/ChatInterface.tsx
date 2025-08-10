import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ToolConfirmationDialog from './ToolConfirmationDialog';
import Alert from './ui/Alert';
import { ResponsiveContainer } from './ui/ResponsiveContainer';
import { useChatStore } from '../store/chatStore';
import { useSettingsStore } from '../store/settingsStore';
import { useEnhancedAccessibility } from '../hooks/useAccessibility';
import { useResponsive, useTouchDevice, useOrientation } from '../hooks/useResponsive';
import type { ToolCall } from '../types';

export interface ChatInterfaceProps {
  className?: string;
}

/**
 * Main chat interface component that provides real-time messaging
 * Integrates MessageList, MessageInput, and tool confirmation
 */
const ChatInterface: React.FC<ChatInterfaceProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const { screenReaderUtils } = useEnhancedAccessibility();
  
  // Responsive hooks
  const { isMobile, isTablet, currentBreakpoint } = useResponsive();
  const isTouch = useTouchDevice();
  const orientation = useOrientation();
  
  // Get chat state from store
  const {
    currentSession,
    messages,
    isLoading,
    pendingToolCall,
    error: storeError,
    sendMessage,
    deleteMessage,
    confirmToolCall,
    cancelToolCall,
    setError: setStoreError,
  } = useChatStore();

  // Get settings to check configuration
  const { llmProviders } = useSettingsStore();

  // Check if current session has valid configuration
  const hasValidProvider = currentSession && llmProviders.some(p => 
    p.name === currentSession.provider && p.enabled
  );

  // Enhanced send message with error handling and real-time feedback
  const handleSendMessage = useCallback(async (content: string) => {
    // Clear local error state
    setError(null);
    
    if (!currentSession) {
      const errorMsg = t('errors.noActiveSession', 'No active chat session. Please create a new chat.');
      setError(errorMsg);
      screenReaderUtils.announceError(errorMsg, 'Chat');
      return;
    }

    if (!hasValidProvider) {
      const errorMsg = t('errors.noValidProvider', 'No valid LLM provider configured. Please check your settings.');
      setError(errorMsg);
      screenReaderUtils.announceError(errorMsg, 'Chat');
      return;
    }

    try {
      await sendMessage(content);
      // Clear local error on successful send
      setError(null);
      // Announce message sent to screen readers
      screenReaderUtils.announceSuccess('Message sent', 'Chat');
    } catch (error) {
      // Error is already handled in the store, but we can add local handling if needed
      console.error('Chat interface: Message send failed:', error);
      screenReaderUtils.announceError('Failed to send message', 'Chat');
    }
  }, [currentSession, hasValidProvider, sendMessage, setError, screenReaderUtils, t]);

  // Enhanced tool confirmation with error handling and accessibility
  const handleConfirmToolCall = useCallback(async (toolCall: ToolCall) => {
    // Clear local error state
    setError(null);
    
    try {
      await confirmToolCall(toolCall);
      // Clear local error on successful execution
      setError(null);
      screenReaderUtils.announceSuccess('Tool executed successfully', 'Tool execution');
    } catch (error) {
      // Error is already handled in the store, but we can add local handling if needed
      console.error('Chat interface: Tool execution failed:', error);
      screenReaderUtils.announceError('Tool execution failed', 'Tool execution');
    }
  }, [confirmToolCall, setError, screenReaderUtils]);

  // Handle tool cancellation with accessibility feedback
  const handleCancelToolCall = useCallback(() => {
    cancelToolCall();
    screenReaderUtils.announceSuccess('Tool execution cancelled', 'Tool execution');
  }, [cancelToolCall, screenReaderUtils]);

  // Handle message deletion with accessibility feedback
  const handleDeleteMessage = useCallback((messageId: string) => {
    deleteMessage(messageId);
    screenReaderUtils.announceSuccess('Message deleted', 'Chat');
  }, [deleteMessage, screenReaderUtils]);

  // Clear local error when session changes or store error changes
  useEffect(() => {
    setError(null);
  }, [currentSession?.id]);

  // Sync store error with local error state
  useEffect(() => {
    if (storeError && !error) {
      setError(storeError);
    }
  }, [storeError, error]);

  // Show setup message if no session
  if (!currentSession) {
    return (
      <div 
        className={`h-full flex flex-col items-center justify-center bg-white dark:bg-gray-800 ${className}`}
        data-breakpoint={currentBreakpoint}
        data-orientation={orientation}
        data-touch={isTouch}
      >
        <ResponsiveContainer maxWidth="md" padding="lg" className="text-center">
          <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} mx-auto mb-4 text-gray-400 dark:text-gray-500`} aria-hidden="true">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-white mb-2`}>
            {t('chat.noSession', 'No Chat Session')}
          </h3>
          <p className={`text-gray-500 dark:text-gray-400 ${isMobile ? 'text-sm' : 'text-base'}`}>
            {t('chat.createNewChat', 'Create a new chat to start a conversation with an AI assistant.')}
          </p>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div 
      className={`chat-interface h-full flex flex-col bg-white dark:bg-gray-800 ${className}`} 
      role="main" 
      aria-label={t('chat.chatInterface', 'Chat interface')}
      data-breakpoint={currentBreakpoint}
      data-orientation={orientation}
      data-touch={isTouch}
    >
      {/* Skip link for keyboard users */}
      <a 
        href="#message-input" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg"
        onClick={(e) => {
          e.preventDefault();
          const input = document.getElementById('message-input');
          if (input) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }}
      >
        {t('accessibility.skipToMessageInput', 'Skip to message input')}
      </a>

      {/* Error Alert */}
      {(error || storeError) && (
        <div className={`flex-shrink-0 ${isMobile ? 'p-3' : 'p-4'}`} role="alert" aria-live="assertive">
          <ResponsiveContainer maxWidth="full" padding="none">
            <Alert
              variant="error"
              title={t('errors.error', 'Error')}
              dismissible
              onDismiss={() => {
                setError(null);
                if (setStoreError) {
                  setStoreError(null);
                }
              }}
            >
              {error || storeError || ''}
            </Alert>
          </ResponsiveContainer>
        </div>
      )}

      {/* Configuration Warning */}
      {!hasValidProvider && (
        <div className={`flex-shrink-0 ${isMobile ? 'p-3' : 'p-4'}`}>
          <ResponsiveContainer maxWidth="full" padding="none">
            <Alert
              variant="warning"
              title={t('warnings.configurationRequired', 'Configuration Required')}
            >
              <div className="space-y-2">
                <p className={isMobile ? 'text-sm' : 'text-base'}>
                  {t('warnings.noValidProvider', 'Please configure a valid LLM provider in settings to start chatting.')}
                </p>
                <div className={`flex items-center space-x-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span>💡</span>
                  <span>
                    {currentSession?.provider === 'openai' 
                      ? 'You need to add your OpenAI API key in Settings → LLM Provider'
                      : `You need to configure ${currentSession?.provider} in Settings → LLM Provider`
                    }
                  </span>
                </div>
                <button
                  onClick={() => window.location.hash = '#/settings'}
                  className={`
                    inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors font-medium
                    ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'}
                    ${isTouch ? 'touch-manipulation min-h-[44px]' : ''}
                  `}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Go to Settings
                </button>
              </div>
            </Alert>
          </ResponsiveContainer>
        </div>
      )}

      {/* Messages area with streaming support */}
      <section 
        className="flex-1 min-h-0 overflow-hidden" 
        aria-label={t('chat.messagesSection', 'Chat messages')}
        role="log"
        aria-live="polite"
        aria-atomic="false"
      >
        <MessageList
          messages={messages}
          isLoading={isLoading}
          autoScroll={true}
          onDeleteMessage={handleDeleteMessage}
          className={`h-full ${isMobile ? 'p-2' : isTablet ? 'p-4' : 'p-6'}`}
          isMobile={isMobile}
          isTouch={isTouch}
        />
      </section>

      {/* Input area - Fixed at bottom with auto-resize */}
      <section 
        className="flex-shrink-0 mt-auto" 
        aria-label={t('chat.inputSection', 'Message input')}
      >
        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={!hasValidProvider}
          placeholder={
            hasValidProvider 
              ? t('chat.messagePlaceholder', 'Type your message...')
              : t('chat.configureProviderFirst', 'Configure an LLM provider in settings first')
          }
          isMobile={isMobile}
          isTouch={isTouch}
        />
      </section>

      {/* Tool Confirmation Dialog with enhanced accessibility */}
      <ToolConfirmationDialog
        isOpen={!!pendingToolCall}
        toolCall={pendingToolCall}
        onConfirm={handleConfirmToolCall}
        onCancel={handleCancelToolCall}
        isExecuting={isLoading}
        isMobile={isMobile}
        isTouch={isTouch}
      />
    </div>
  );
};

export default ChatInterface;