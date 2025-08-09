import { useChatStore } from '../store/chatStore';
import type { LLMProvider } from '../types';

/**
 * Hook for chat functionality
 * Provides convenient methods for chat operations
 */
export const useChat = () => {
  const store = useChatStore();
  
  const {
    currentSession,
    messages,
    isLoading,
    pendingToolCall,
    sessions,
    sendMessage,
    confirmToolCall,
    cancelToolCall,
    loadSession,
    createNewSession,
    updateSessionTitle,
    deleteSession,
    archiveSession,
    searchSessions,
    addMessage,
    updateMessage,
    deleteMessage,
    setPendingToolCall,
    setLoading,
    generateSessionTitle,
    clearCurrentSession,
  } = store;
  
  // Convenience methods
  const hasActiveSession = !!currentSession;
  const hasMessages = messages.length > 0;
  const hasPendingTool = !!pendingToolCall;
  const canSendMessage = hasActiveSession && !isLoading && !hasPendingTool;
  
  const startNewChat = (provider: LLMProvider, model: string, mcpServers?: string[]) => {
    createNewSession(provider, model, mcpServers);
  };
  
  const switchToSession = async (sessionId: string) => {
    try {
      await loadSession(sessionId);
    } catch (error) {
      console.error('Failed to load session:', error);
      throw error;
    }
  };
  
  const sendChatMessage = async (content: string) => {
    if (!canSendMessage) {
      throw new Error('Cannot send message at this time');
    }
    
    if (!content.trim()) {
      throw new Error('Message cannot be empty');
    }
    
    try {
      await sendMessage(content);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };
  
  const executeToolCall = async (toolCall: any) => {
    if (!toolCall) {
      throw new Error('No tool call to execute');
    }
    
    try {
      await confirmToolCall(toolCall);
    } catch (error) {
      console.error('Failed to execute tool call:', error);
      throw error;
    }
  };
  
  const rejectToolCall = () => {
    if (pendingToolCall) {
      cancelToolCall();
    }
  };
  
  const removeSession = (sessionId: string) => {
    if (currentSession?.id === sessionId) {
      clearCurrentSession();
    }
    deleteSession(sessionId);
  };
  
  const renameSession = (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      throw new Error('Session title cannot be empty');
    }
    updateSessionTitle(sessionId, newTitle.trim());
  };
  
  const findSessions = (query: string) => {
    return searchSessions(query);
  };
  
  return {
    // State
    currentSession,
    messages,
    isLoading,
    pendingToolCall,
    sessions,
    
    // Computed state
    hasActiveSession,
    hasMessages,
    hasPendingTool,
    canSendMessage,
    
    // Actions
    startNewChat,
    switchToSession,
    sendChatMessage,
    executeToolCall,
    rejectToolCall,
    removeSession,
    renameSession,
    archiveSession,
    findSessions,
    clearCurrentSession,
    
    // Message management
    addMessage,
    updateMessage,
    deleteMessage,
    
    // Tool management
    setPendingToolCall,
    setLoading,
    
    // Utilities
    generateSessionTitle,
  };
};

export default useChat;