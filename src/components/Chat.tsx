import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ToolConfirmationDialog from './ToolConfirmationDialog';
import Alert from './ui/Alert';
import { useChatStore } from '../store/chatStore';
import { useSettingsStore } from '../store/settingsStore';
import { useEnhancedAccessibility } from '../hooks/useEnhancedAccessibility';
import type { ToolCall } from '../types';

const Chat: React.FC = () => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const { screenReaderUtils } = useEnhancedAccessibility();
  
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
  // Note: API keys are now stored securely in backend, so we only check if provider exists and is enabled
  const hasValidProvider = currentSession && llmProviders.some(p => 
    p.name === currentSession.provider && p.enabled
  );

  // Enhanced send message with error handling
  const handleSendMessage = async (content: string) => {
    // Clear local error state
    setError(null);
    
    if (!currentSession) {
      const errorMsg = t('errors.noActiveSession', 'No active chat session. Please create a new chat.');
      setError(errorMsg);
      return;
    }

    if (!hasValidProvider) {
      const errorMsg = t('errors.noValidProvider', 'No valid LLM provider configured. Please check your settings.');
      setError(errorMsg);
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
      console.error('Chat component: Message send failed:', error);
      screenReaderUtils.announceError('Failed to send message', 'Chat');
    }
  };

  // Enhanced tool confirmation with error handling
  const handleConfirmToolCall = async (toolCall: ToolCall) => {
    // Clear local error state
    setError(null);
    
    try {
      await confirmToolCall(toolCall);
      // Clear local error on successful execution
      setError(null);
      screenReaderUtils.announceSuccess('Tool executed successfully', 'Tool execution');
    } catch (error) {
      // Error is already handled in the store, but we can add local handling if needed
      console.error('Chat component: Tool execution failed:', error);
      screenReaderUtils.announceError('Tool execution failed', 'Tool execution');
    }
  };

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
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" aria-hidden="true">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('chat.noSession', 'No Chat Session')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {t('chat.createNewChat', 'Create a new chat to start a conversation with an AI assistant.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container in-layout bg-white dark:bg-gray-800" role="main" aria-label={t('chat.chatInterface', 'Chat interface')}>
      {/* Skip link for keyboard users */}
      <a 
        href="#message-input" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg"
      >
        {t('accessibility.skipToMessageInput', 'Skip to message input')}
      </a>

      {/* Error Alert */}
      {(error || storeError) && (
        <div className="flex-shrink-0 p-4" role="alert" aria-live="assertive">
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
        </div>
      )}

      {/* Configuration Warning */}
      {!hasValidProvider && (
        <div className="flex-shrink-0 p-4">
          <Alert
            variant="warning"
            title={t('warnings.configurationRequired', 'Configuration Required')}
          >
            <div className="space-y-2">
              <p>{t('warnings.noValidProvider', 'Please configure a valid LLM provider in settings to start chatting.')}</p>
              <div className="flex items-center space-x-2 text-sm">
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
                className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Go to Settings
              </button>
            </div>
          </Alert>
        </div>
      )}

      {/* Messages area */}
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
          onDeleteMessage={deleteMessage}
          className="h-full p-2 sm:p-4 lg:p-6"
        />
      </section>

      {/* Input area - Fixed at bottom */}
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
        />
      </section>

      {/* Tool Confirmation Dialog */}
      <ToolConfirmationDialog
        isOpen={!!pendingToolCall}
        toolCall={pendingToolCall}
        onConfirm={handleConfirmToolCall}
        onCancel={cancelToolCall}
        isExecuting={isLoading}
      />
    </div>
  );
};

export default Chat;
