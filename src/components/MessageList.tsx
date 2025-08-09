import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MessageItem from './MessageItem';
import { Spinner } from './ui';
import type { Message } from '../types';

export interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  autoScroll?: boolean;
  onCopyMessage?: (content: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  className?: string;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading = false,
  autoScroll = true,
  onCopyMessage,
  onRegenerateMessage,
  onDeleteMessage,
  className = '',
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
      <div className={`flex-1 flex items-center justify-center p-8 ${className}`}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('chat.sessionTitle')}
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
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
        <div className="max-w-4xl mx-auto px-2 sm:px-0">
          {messageGroups.map((group) => (
            <div key={group.date}>
              {/* Date header */}
              {messageGroups.length > 1 && (
                <div className="sticky top-0 z-10 flex justify-center py-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                  <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
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
                />
              ))}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
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
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20">
          <button
            onClick={handleScrollToBottom}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 sm:p-3 shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Scroll to bottom"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageList;