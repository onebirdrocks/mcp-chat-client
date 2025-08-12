'use client';
import { useState, useEffect } from 'react';
import { MessageSquare, Trash2, Edit3, Check, X, RefreshCw } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

import { Conversation } from '@/lib/types';

interface ConversationHistoryProps {
  onSelectConversation: (conversation: Conversation) => void;
  currentConversationId?: string;
}

export default function ConversationHistory({ 
  onSelectConversation, 
  currentConversationId 
}: ConversationHistoryProps) {
  const { isDarkMode } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chats');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.chats || []);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (!confirm('确定要删除这个对话吗？')) return;
    
    try {
      const response = await fetch(`/api/chats/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleEditTitle = async (id: string) => {
    try {
      const response = await fetch(`/api/chats/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: editingTitle })
      });
      
      if (response.ok) {
        setConversations(prev => 
          prev.map(conv => 
            conv.id === id ? { ...conv, title: editingTitle } : conv
          )
        );
        setEditingId(null);
        setEditingTitle('');
      }
    } catch (error) {
      console.error('Failed to update conversation title:', error);
    }
  };

  const handleRegenerateTitle = async (id: string) => {
    try {
      const response = await fetch(`/api/chats/${id}/title`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(prev => 
          prev.map(conv => 
            conv.id === id ? { ...conv, title: data.title } : conv
          )
        );
      }
    } catch (error) {
      console.error('Failed to regenerate title:', error);
    }
  };

  const startEditing = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('zh-CN', { 
        month: 'short', 
        day: 'numeric' 
      });
    } else {
      return date.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${
        isDarkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
        加载中...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center ${
        isDarkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>
        <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">Your conversations will appear here once you start chatting!</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className={`group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
            currentConversationId === conversation.id
              ? isDarkMode 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-100 text-blue-900'
              : isDarkMode
                ? 'hover:bg-gray-700 text-gray-300'
                : 'hover:bg-gray-100 text-gray-700'
          }`}
          onClick={() => onSelectConversation(conversation)}
        >
          <div className="flex-shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            {editingId === conversation.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className={`flex-1 px-2 py-1 text-sm rounded border ${
                    isDarkMode 
                      ? 'bg-gray-600 border-gray-500 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEditTitle(conversation.id);
                    } else if (e.key === 'Escape') {
                      cancelEditing();
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditTitle(conversation.id);
                  }}
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelEditing();
                  }}
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="font-medium truncate">{conversation.title}</div>
                <div className={`text-xs ${
                  currentConversationId === conversation.id
                    ? 'text-blue-100'
                    : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {conversation.modelName} • {formatDate(conversation.updatedAt)}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRegenerateTitle(conversation.id);
                }}
                className={`p-1 rounded hover:bg-gray-600 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
                title="重新生成标题"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing(conversation);
                }}
                className={`p-1 rounded hover:bg-gray-600 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
                title="编辑标题"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(conversation.id);
                }}
                className={`p-1 rounded hover:bg-red-600 hover:text-white ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
                title="删除对话"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
