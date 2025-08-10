'use client';

import React, { useState, useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import type { ChatSession } from '../../../lib/types';

interface ChatSessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
  onArchive: () => void;
  isMobile?: boolean;
  isTouch?: boolean;
}

export const ChatSessionItem: React.FC<ChatSessionItemProps> = ({
  session,
  isActive,
  onClick,
  onRename,
  onDelete,
  onArchive,
  isMobile = false,
  isTouch = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close menu when clicking outside
  useClickOutside(menuRef, () => setShowMenu(false), showMenu);
  
  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };
  
  const handleMenuAction = (action: () => void) => {
    action();
    setShowMenu(false);
  };
  
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return (
          <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0" title="OpenAI" />
        );
      case 'deepseek':
        return (
          <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0" title="DeepSeek" />
        );
      case 'openrouter':
        return (
          <div className="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0" title="OpenRouter" />
        );
      default:
        return (
          <div className="w-3 h-3 bg-gray-500 rounded-full flex-shrink-0" title={provider} />
        );
    }
  };
  
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`
          w-full text-left rounded-lg transition-colors duration-200
          hover:bg-gray-100 dark:hover:bg-gray-800
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${isTouch ? 'p-4 touch-manipulation' : 'p-3'}
          ${isActive 
            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
            : 'border border-transparent'
          }
        `}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              {getProviderIcon(session.provider)}
              <h3 className={`
                ${isMobile ? 'text-sm' : 'text-sm'} font-medium truncate
                ${isActive 
                  ? 'text-blue-900 dark:text-blue-100' 
                  : 'text-gray-900 dark:text-white'
                }
              `}>
                {session.title}
              </h3>
            </div>
            
            <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 dark:text-gray-400`}>
              <span>{session.messages?.length || 0} messages</span>
              <span>{formatDate(session.updatedAt)}</span>
            </div>
            
            {!isMobile && (
              <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {session.model}
              </div>
            )}
          </div>
          
          <div className="ml-2 flex-shrink-0">
            <div
              onClick={handleMenuToggle}
              className={`
                inline-flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors
                ${isTouch ? 'opacity-100 p-2 touch-manipulation' : 'opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 p-1'}
              `}
              role="button"
              tabIndex={0}
              aria-label="Session options"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleMenuToggle(e as any);
                }
              }}
            >
              <svg className={`${isTouch ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </div>
          </div>
        </div>
      </button>
      
      {/* Context Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className={`
            absolute right-0 top-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10
            ${isMobile ? 'w-52' : 'w-48'}
          `}
          role="menu"
        >
          <div className="py-1">
            <button
              onClick={() => handleMenuAction(onRename)}
              className={`
                w-full text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center
                ${isTouch ? 'px-4 py-3 touch-manipulation' : 'px-4 py-2'}
              `}
              role="menuitem"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Rename
            </button>
            
            <button
              onClick={() => handleMenuAction(onArchive)}
              className={`
                w-full text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center
                ${isTouch ? 'px-4 py-3 touch-manipulation' : 'px-4 py-2'}
              `}
              role="menuitem"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4 4-4m6 5l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Archive
            </button>
            
            <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
            
            <button
              onClick={() => handleMenuAction(onDelete)}
              className={`
                w-full text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center
                ${isTouch ? 'px-4 py-3 touch-manipulation' : 'px-4 py-2'}
              `}
              role="menuitem"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSessionItem;