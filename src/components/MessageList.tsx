import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MessageItem from './MessageItem';
import { Spinner } from './ui';
import type { Message } from '../types';

export interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  autoScroll?: boolean;
  streamingMessage?: string;
  onCopyMessage?: (content: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  className?: string;
  isMobile?: boolean;
  isTouch?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading = false,
  autoScroll = true,
  streamingMessage,
  onCopyMessage,
  onRegenerateMessage,
  onDeleteMessage,
  className = '',
  isMobile = false,
  isTouch = false,
}) => {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);


  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && shouldAutoScroll && isNearBottom) {
      scrollToBottom();
    }
  }, [messages, isLoading, autoScroll, shouldAutoScroll, isNearBottom]);

  // Check if user is near bottom of the scroll area
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const nearBottom = distanceFromBottom < 100; // Within 100px of bottom
      
      setIsNearBottom(nearBottom);
      setShouldAutoScroll(nearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  };

  const handleScrollToBottom = () => {
    setShouldAutoScroll(true);
    scrollToBottom();
  };

  // Group messages by date for better organization
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentGroup: { date: string; messages: Message[] } | null = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.timestamp).toDateString();
      
      if (!currentGroup || currentGroup.date !== messageDate) {
        currentGroup = { date: messageDate, messages: [message] };
        groups.push(currentGroup);
      } else {
        currentGroup.messages.push(message);
      }
    });

    return groups;
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

    if (dateString === today) {
      return t('common.today');
    } else if (dateString === yesterday) {
      return t('common.yesterday');
    } else {
      return date.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const messageGroups = groupMessagesByDate(messages);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${isMobile ? 'p-4' : 'p-8'} ${className}`}>
        <div className="text-center max-w-md">
          <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4`}>
            <svg className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-white mb-2`}>
            {t('chat.sessionTitle')}
          </h3>
          <p className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-base'}`}>
            {t('chat.noMessages')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col relative ${className}`}>
      {/* Messages container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className={`max-w-4xl mx-auto ${isMobile ? 'px-0' : 'px-2 sm:px-0'}`}>
          {messageGroups.map((group) => (
            <div key={group.date}>
              {/* Date header */}
              {messageGroups.length > 1 && (
                <div className="sticky top-0 z-10 flex justify-center py-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                  <div className={`bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full font-medium text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    {formatDateHeader(group.date)}
                  </div>
                </div>
              )}

              {/* Messages in this date group */}
              {group.messages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  onCopy={onCopyMessage}
                  onRegenerate={onRegenerateMessage}
                  onDelete={onDeleteMessage}
                  isMobile={isMobile}
                  isTouch={isTouch}
                />
              ))}
            </div>
          ))}

          {/* Streaming message indicator */}
          {streamingMessage && (
            <div className="flex gap-2 sm:gap-3 p-3 sm:p-4">
              <div className="flex-shrink-0 mt-1">
                <div className="w-6 h-6 sm:w-8 sm:h-8">
                  <div className="w-full h-full bg-green-500 rounded-full flex items-center justify-center text-white">
                    <svg className="w-3 h-3 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    Assistant
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert prose-gray">
                  <div className="whitespace-pre-wrap break-words">
                    {streamingMessage}
                    <span className="inline-block w-2 h-4 bg-green-500 animate-pulse ml-1"></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && !streamingMessage && (
            <div className="flex items-center justify-center p-4">
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                <Spinner size="sm" />
                <span className="text-sm">{t('common.loading')}</span>
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {!isNearBottom && messages.length > 0 && (
        <div className={`absolute z-20 ${isMobile ? 'bottom-2 right-2' : 'bottom-3 right-3 sm:bottom-4 sm:right-4'}`}>
          <button
            onClick={handleScrollToBottom}
            className={`
              bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-colors duration-200 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${isMobile ? 'p-3' : 'p-2 sm:p-3'}
              ${isTouch ? 'touch-manipulation min-w-[48px] min-h-[48px]' : ''}
            `}
            aria-label="Scroll to bottom"
          >
            <svg className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4 sm:w-5 sm:h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageList;