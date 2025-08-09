import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button, Input, Modal, Spinner } from './ui';
import { LanguageSelector } from './LanguageSelector';
import ChatHistoryItem from './ChatHistoryItem';
import NewChatModal from './NewChatModal';
import { useChatStore } from '../store/chatStore';
import { useKeyboardNavigation } from '../hooks/useAccessibility';
import type { LLMProvider } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onClose,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState('');
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [deleteSessionId, setDeleteSessionId] = useState('');
  
  // Keyboard navigation for chat history
  const chatHistoryRef = useRef<HTMLElement>(null);
  const { handleKeyDown, updateItems } = useKeyboardNavigation(
    chatHistoryRef,
    '[role="button"]',
    'vertical'
  );

  const {
    currentSession,

    isLoadingSessions,
    createNewSession,
    loadSession,
    updateSessionTitle,
    deleteSession,
    searchSessions,
    initializeStore,
  } = useChatStore();

  // Initialize store on mount
  useEffect(() => {
    initializeStore();
  }, [initializeStore]);



  // Filter sessions based on search query
  const filteredSessions = searchSessions(searchQuery) || [];

  // Update keyboard navigation when sessions change
  useEffect(() => {
    updateItems();
  }, [filteredSessions, updateItems]);

  const handleNewChat = () => {
    setShowNewChatModal(true);
  };

  const handleCreateNewChat = (provider: LLMProvider, model: string) => {
    createNewSession(provider, model);
    setShowNewChatModal(false);
  };

  const handleSessionSelect = async (sessionId: string) => {
    try {
      await loadSession(sessionId);
      onClose(); // Close sidebar on mobile after selecting session
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleRenameSession = (sessionId: string, currentTitle: string) => {
    setRenameSessionId(sessionId);
    setNewSessionTitle(currentTitle);
    setShowRenameModal(true);
  };

  const handleConfirmRename = () => {
    if (renameSessionId && newSessionTitle.trim()) {
      updateSessionTitle(renameSessionId, newSessionTitle.trim());
      setShowRenameModal(false);
      setRenameSessionId('');
      setNewSessionTitle('');
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setDeleteSessionId(sessionId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (deleteSessionId) {
      deleteSession(deleteSessionId);
      setShowDeleteModal(false);
      setDeleteSessionId('');
    }
  };



  return (
    <>
      <nav className="flex flex-col h-full" role="navigation" aria-label={t('navigation.sidebar', 'Sidebar navigation')}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('app.title', 'MCP Chat UI')}
          </h1>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onClose}
            aria-label={t('common.close', 'Close sidebar')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Sidebar content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* New Chat Button */}
          <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleNewChat}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              {t('chat.newChat', 'New Chat')}
            </Button>
          </div>

          {/* Search */}
          <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
            <Input
              placeholder={t('chat.searchHistory', 'Search chat history...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
              fullWidth
            />
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 sm:p-4">
              <h2 
                id="chat-history-heading"
                className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3"
              >
                {t('chat.chatHistory', 'Chat History')}
              </h2>
              
              {isLoadingSessions ? (
                <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
                  <Spinner size="sm" />
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    {t('common.loading', 'Loading...')}
                  </span>
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2" role="status">
                  {searchQuery ? 
                    t('chat.noSearchResults', 'No matching conversations found') :
                    t('chat.noHistory', 'No chat history yet')
                  }
                </div>
              ) : (
                <div 
                  ref={chatHistoryRef as React.RefObject<HTMLDivElement>}
                  className="space-y-1" 
                  role="list" 
                  aria-labelledby="chat-history-heading"
                  onKeyDown={handleKeyDown}
                >
                  {filteredSessions.map((session) => (
                    <ChatHistoryItem
                      key={session.id}
                      session={session}
                      isActive={currentSession?.id === session.id}
                      onClick={() => handleSessionSelect(session.id)}
                      onRename={() => handleRenameSession(session.id, session.title)}
                      onDelete={() => handleDeleteSession(session.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar footer */}
          <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
            {/* Settings Link */}
            <div className="mb-3">
              <Link
                to="/settings"
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t('navigation.settings', 'Settings')}
              </Link>
            </div>
            
            <div className="mb-3">
              <LanguageSelector />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('app.version', 'Version 1.0.0')}
            </div>
          </div>
        </div>
      </nav>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onCreateChat={handleCreateNewChat}
      />

      {/* Rename Session Modal */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        title={t('chat.renameSession', 'Rename Session')}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label={t('chat.sessionTitle', 'Session Title')}
            value={newSessionTitle}
            onChange={(e) => setNewSessionTitle(e.target.value)}
            placeholder={t('chat.enterTitle', 'Enter session title')}
            fullWidth
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowRenameModal(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmRename}
              disabled={!newSessionTitle.trim()}
            >
              {t('common.save', 'Save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Session Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('chat.deleteSession', 'Delete Session')}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            {t('chat.deleteConfirmation', 'Are you sure you want to delete this chat session? This action cannot be undone.')}
          </p>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
            >
              {t('common.delete', 'Delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Sidebar;