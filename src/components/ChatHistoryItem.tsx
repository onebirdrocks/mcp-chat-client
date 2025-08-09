import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';
import { type ChatSession } from '../types';

interface ChatHistoryItemProps {
  session: ChatSession;
  isActive: boolean;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
}

const ChatHistoryItem: React.FC<ChatHistoryItemProps> = ({
  session,
  isActive,
  onClick,
  onRename,
  onDelete,
}) => {
  const { t } = useTranslation();

  const formatDate = (date: Date | string | number) => {
    // Ensure we have a valid Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return t('common.unknown', 'Unknown');
    }
    
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return t('common.today', 'Today');
    } else if (diffInDays === 1) {
      return t('common.yesterday', 'Yesterday');
    } else if (diffInDays < 7) {
      return t('common.daysAgo', '{{count}} days ago', { count: diffInDays });
    } else {
      return dateObj.toLocaleDateString();
    }
  };

  return (
    <div
      className={`group relative flex items-center px-3 py-2 text-sm rounded-md cursor-pointer transition-colors duration-200 ${
        isActive
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">
          {session.title}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formatDate(session.updatedAt)} • {t('chat.messageCount', '{{count}} message', { count: session.messages.length })}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {t(`providers.${session.provider}`, session.provider)} • {session.model}
        </div>
      </div>
      
      {/* Session actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-1 ml-2">
        <Button
          variant="ghost"
          size="sm"
          className="p-1 h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onRename();
          }}
          aria-label={t('chat.renameSession', 'Rename Session')}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="p-1 h-6 w-6 text-red-500 hover:text-red-700"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label={t('chat.deleteSession', 'Delete Session')}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </div>
    </div>
  );
};

export default ChatHistoryItem;