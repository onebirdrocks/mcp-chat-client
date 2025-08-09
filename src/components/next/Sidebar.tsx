'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button, Input, Modal } from '../ui';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useChatSessions } from '../../hooks/useChatSessions';
import { ChatSessionItem } from './ChatSessionItem';
import { NewChatModal } from './NewChatModal';
import type { ChatSession } from '../../../lib/types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  className = '',
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [newTitle, setNewTitle] = useState('');
  
  // Chat sessions hook
  const {
    chatSessions,
    createSession,
    updateSession,
    deleteSession,
    searchSessions,
  } = useChatSessions();
  
  // Close sidebar when clicking outside (mobile)
  useClickOutside(sidebarRef, onClose, isOpen);
  
  // Filter sessions based on search
  const filteredSessions = searchSessions(searchQuery);
  
  // Get current session ID from pathname
  const currentSessionId = pathname.startsWith('/chat/') 
    ? pathname.split('/')[2] 
    : null;
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  // Handle new chat creation
  const handleNewChat = () => {
    setShowNewChatModal(true);
  };
  
  const handleCreateChat = (provider: string, model: string) => {
    const sessionId = createSession(provider, model);
    setShowNewChatModal(false);
    router.push(`/chat/${sessionId}`);
    onClose(); // Close sidebar on mobile
  };
  
  // Handle session selection
  const handleSessionSelect = (sessionId: string) => {
    router.push(`/chat/${sessionId}`);
    onClose(); // Close sidebar on mobile
  };
  
  // Handle session rename
  const handleRenameSession = (session: ChatSession) => {
    setSelectedSession(session);
    setNewTitle(session.title);
    setShowRenameModal(true);
  };
  
  const handleConfirmRename = () => {
    if (selectedSession && newTitle.trim()) {
      updateSession(selectedSession.id, { title: newTitle.trim() });
      setShowRenameModal(false);
      setSelectedSession(null);
      setNewTitle('');
    }
  };
  
  // Handle session deletion
  const handleDeleteSession = (session: ChatSession) => {
    setSelectedSession(session);
    setShowDeleteModal(true);
  };
  
  const handleConfirmDelete = () => {
    if (selectedSession) {
      deleteSession(selectedSession.id);
      setShowDeleteModal(false);
      setSelectedSession(null);
      
      // Navigate away if we're deleting the current session
      if (currentSessionId === selectedSession.id) {
        router.push('/');
      }
    }
  };
  
  // Handle session archiving (for now, same as delete)
  const handleArchiveSession = (session: ChatSession) => {
    handleDeleteSession(session);
  };
  
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`
          fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
          w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
          transform transition-transform duration-300 ease-in-out lg:transform-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col h-full
          ${className}
        `}
        aria-label="Chat navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            MCP Chat UI
          </h1>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
        
        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
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
            New Chat
          </Button>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Input
            placeholder="Search conversations..."
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
          <div className="p-4">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Recent Conversations
            </h2>
            
            {filteredSessions.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                {searchQuery ? 'No matching conversations found' : 'No conversations yet'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSessions.map((session) => (
                  <ChatSessionItem
                    key={session.id}
                    session={session}
                    isActive={currentSessionId === session.id}
                    onClick={() => handleSessionSelect(session.id)}
                    onRename={() => handleRenameSession(session)}
                    onDelete={() => handleDeleteSession(session)}
                    onArchive={() => handleArchiveSession(session)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => router.push('/settings')}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            >
              Settings
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => router.push('/history')}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              History
            </Button>
          </div>
          
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
            Version 1.0.0
          </div>
        </div>
      </aside>
      
      {/* Modals */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onCreateChat={handleCreateChat}
      />
      
      {/* Rename Modal */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        title="Rename Conversation"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Conversation Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter new title"
            fullWidth
            autoFocus
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowRenameModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmRename}
              disabled={!newTitle.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Conversation"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete "{selectedSession?.title}"? This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Sidebar;