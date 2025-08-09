import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChatSession, Message, ToolCall, LLMProvider, ChatRequest, RunToolRequest } from '../types';
import { chatApi } from '../services/apiClient';
import { useSettingsStore } from './settingsStore';

interface ChatStore {
  // Current session state
  currentSession: ChatSession | null;
  messages: Message[];
  isLoading: boolean;
  pendingToolCall: ToolCall | null;
  
  // Chat history
  sessions: ChatSession[];
  isLoadingSessions: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  confirmToolCall: (toolCall: ToolCall) => Promise<void>;
  cancelToolCall: () => void;
  loadSession: (sessionId: string) => Promise<void>;
  createNewSession: (provider: LLMProvider, model: string, mcpServers?: string[]) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  deleteSession: (sessionId: string) => void;
  archiveSession: (sessionId: string) => void;
  searchSessions: (query: string) => ChatSession[];
  
  // Message management
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  
  // Session persistence
  saveSession: () => void;
  loadSessions: () => Promise<void>;
  initializeStore: () => Promise<void>;
  
  // Tool call management
  setPendingToolCall: (toolCall: ToolCall | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Utility functions
  generateSessionTitle: (messages: Message[]) => string;
  clearCurrentSession: () => void;
}

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const generateSessionTitle = (messages: Message[]): string => {
  // Find the first user message to generate a title
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) {
    return 'New Chat';
  }
  
  // Take first 50 characters and add ellipsis if longer
  const content = firstUserMessage.content.trim();
  if (content.length <= 50) {
    return content;
  }
  
  return content.substring(0, 47) + '...';
};

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSession: null,
      messages: [],
      isLoading: false,
      pendingToolCall: null,
      sessions: [],
      isLoadingSessions: false,
      error: null,
      
      // Actions
      sendMessage: async (content: string) => {
        console.log('🚀 sendMessage called with:', content);
        const { currentSession, addMessage, saveSession } = get();
        
        if (!currentSession) {
          console.error('❌ No active session');
          throw new Error('No active session');
        }
        
        console.log('📝 Current session:', currentSession);
        
        // Add user message immediately
        const userMessage: Omit<Message, 'id' | 'timestamp'> = {
          role: 'user',
          content: content.trim(),
        };
        
        console.log('➕ Adding user message:', userMessage);
        addMessage(userMessage);
        set({ isLoading: true, error: null });
        
        try {
          // Get settings for API configuration
          console.log('🔧 Getting settings...');
          const settingsStore = useSettingsStore.getState();
          console.log('⚙️ Settings store:', settingsStore);
          
          const provider = settingsStore.llmProviders.find(p => 
            p.name === currentSession.provider && p.enabled
          );
          
          console.log('🔍 Found provider:', provider);
          
          if (!provider) {
            console.error('❌ No valid provider found');
            throw new Error(`No valid ${currentSession.provider} provider configuration found. Please check your settings.`);
          }
          
          // Prepare chat request with current messages (including the new user message)
          // Note: API key is now handled securely by the backend
          const currentMessages = get().messages;
          const chatRequest: ChatRequest = {
            messages: currentMessages,
            sessionId: currentSession.id,
            provider: currentSession.provider,
            model: currentSession.model,
            // API key is retrieved securely from backend storage
            baseUrl: provider.baseUrl,
            // Backend will populate available tools from enabled MCP servers
          };
          
          console.log('📤 Sending chat request:', {
            ...chatRequest,
            // Note: API key is now handled securely by the backend
          });
          
          // Send chat request to backend
          const response = await chatApi.sendMessage(chatRequest);
          
          if (response.error) {
            throw new Error(response.error);
          }
          
          // Handle tool calls if present
          if (response.toolCalls && response.toolCalls.length > 0) {
            // Add assistant message with tool calls
            const assistantMessage: Omit<Message, 'id' | 'timestamp'> = {
              role: 'assistant',
              content: response.reply || 'I need to use a tool to help with your request.',
              toolCalls: response.toolCalls,
            };
            
            addMessage(assistantMessage);
            
            // Set the first tool call as pending (handle one at a time)
            set({ pendingToolCall: response.toolCalls[0] });
          } else if (response.reply) {
            // Add regular assistant response
            const assistantMessage: Omit<Message, 'id' | 'timestamp'> = {
              role: 'assistant',
              content: response.reply,
            };
            
            addMessage(assistantMessage);
          }
          
          saveSession();
          
        } catch (error) {
          console.error('Error sending message:', error);
          
          // Set error state for UI feedback
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          set({ error: errorMessage });
          
          // Add error message to chat for user visibility
          const errorChatMessage: Omit<Message, 'id' | 'timestamp'> = {
            role: 'assistant',
            content: `I encountered an error: ${errorMessage}. Please try again or check your settings.`,
          };
          
          addMessage(errorChatMessage);
          saveSession();
          
          // Re-throw error for component-level handling
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      
      confirmToolCall: async (toolCall: ToolCall) => {
        const { currentSession, addMessage, saveSession } = get();
        
        if (!currentSession) {
          throw new Error('No active session');
        }
        
        set({ isLoading: true, pendingToolCall: null, error: null });
        
        try {
          // Prepare tool execution request with current messages
          const runToolRequest: RunToolRequest = {
            toolCall,
            sessionId: currentSession.id,
            messages: get().messages,
          };
          
          // Execute tool via backend API
          const response = await chatApi.runTool(runToolRequest);
          
          if (response.error) {
            throw new Error(response.error);
          }
          
          // Add tool result message
          const toolMessage: Omit<Message, 'id' | 'timestamp'> = {
            role: 'tool',
            content: response.result,
            toolCallId: toolCall.id,
          };
          
          addMessage(toolMessage);
          
          // Add assistant response to tool result
          if (response.reply) {
            const assistantMessage: Omit<Message, 'id' | 'timestamp'> = {
              role: 'assistant',
              content: response.reply,
            };
            
            addMessage(assistantMessage);
          }
          
          saveSession();
          
        } catch (error) {
          console.error('Error executing tool:', error);
          
          // Set error state for UI feedback
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          set({ error: errorMessage });
          
          // Add error message to chat for user visibility
          const errorChatMessage: Omit<Message, 'id' | 'timestamp'> = {
            role: 'assistant',
            content: `Tool execution failed: ${errorMessage}. Please try again.`,
          };
          
          addMessage(errorChatMessage);
          saveSession();
          
          // Re-throw error for component-level handling
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      
      cancelToolCall: () => {
        const { currentSession, addMessage, saveSession } = get();
        
        if (!currentSession) {
          return;
        }
        
        set({ pendingToolCall: null });
        
        // Add a message indicating the tool was cancelled
        const assistantMessage: Omit<Message, 'id' | 'timestamp'> = {
          role: 'assistant',
          content: 'Tool execution was cancelled by the user.',
        };
        
        addMessage(assistantMessage);
        saveSession();
      },
      
      loadSession: async (sessionId: string) => {
        const { sessions } = get();
        let session = sessions.find(s => s.id === sessionId);
        
        // If session not found locally, try to load from backend
        if (!session) {
          try {
            session = await chatApi.getSession(sessionId);
            
            // Add to local sessions if loaded from backend
            set(state => ({
              sessions: [session!, ...state.sessions.filter(s => s.id !== sessionId)],
            }));
          } catch (error) {
            console.error('Failed to load session from backend:', error);
            throw new Error(`Session ${sessionId} not found`);
          }
        }
        
        set({
          currentSession: session,
          messages: session.messages,
          pendingToolCall: null,
          isLoading: false,
        });
      },
      
      createNewSession: (provider: LLMProvider, model: string, mcpServers: string[] = []) => {
        const newSession: ChatSession = {
          id: generateId(),
          title: 'New Chat',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          provider,
          model,
          mcpServers,
        };
        
        set(state => ({
          currentSession: newSession,
          messages: [],
          sessions: [newSession, ...state.sessions],
          pendingToolCall: null,
          isLoading: false,
        }));
        
        get().saveSession();
      },
      
      updateSessionTitle: (sessionId: string, title: string) => {
        set(state => {
          const updatedSessions = state.sessions.map(session =>
            session.id === sessionId
              ? { ...session, title, updatedAt: new Date() }
              : session
          );
          
          const updatedCurrentSession = state.currentSession?.id === sessionId
            ? { ...state.currentSession, title, updatedAt: new Date() }
            : state.currentSession;
          
          return {
            sessions: updatedSessions,
            currentSession: updatedCurrentSession,
          };
        });
        
        get().saveSession();
      },
      
      deleteSession: (sessionId: string) => {
        set(state => {
          const updatedSessions = state.sessions.filter(s => s.id !== sessionId);
          const updatedCurrentSession = state.currentSession?.id === sessionId
            ? null
            : state.currentSession;
          
          return {
            sessions: updatedSessions,
            currentSession: updatedCurrentSession,
            messages: updatedCurrentSession?.messages || [],
          };
        });
        
        get().saveSession();
      },
      
      archiveSession: (sessionId: string) => {
        // For now, archiving is the same as deleting
        // In the future, we could add an 'archived' flag to sessions
        get().deleteSession(sessionId);
      },
      
      searchSessions: (query: string): ChatSession[] => {
        const { sessions } = get();
        
        // Ensure sessions is always an array
        if (!Array.isArray(sessions)) {
          return [];
        }
        
        if (!query.trim()) {
          return sessions;
        }
        
        const lowercaseQuery = query.toLowerCase();
        
        return sessions.filter(session => {
          // Search in title
          if (session.title.toLowerCase().includes(lowercaseQuery)) {
            return true;
          }
          
          // Search in message content
          return session.messages.some(message =>
            message.content.toLowerCase().includes(lowercaseQuery)
          );
        });
      },
      
      // Message management
      addMessage: (messageData: Omit<Message, 'id' | 'timestamp'>) => {
        const message: Message = {
          ...messageData,
          id: generateId(),
          timestamp: new Date(),
        };
        
        set(state => {
          const updatedMessages = [...state.messages, message];
          const updatedCurrentSession = state.currentSession
            ? {
                ...state.currentSession,
                messages: updatedMessages,
                updatedAt: new Date(),
                // Auto-generate title from first user message if still "New Chat"
                title: state.currentSession.title === 'New Chat' && message.role === 'user'
                  ? generateSessionTitle([message])
                  : state.currentSession.title,
              }
            : null;
          
          const updatedSessions = state.sessions.map(session =>
            session.id === updatedCurrentSession?.id ? updatedCurrentSession : session
          );
          
          return {
            messages: updatedMessages,
            currentSession: updatedCurrentSession,
            sessions: updatedSessions,
          };
        });
        
        // Auto-generate title using backend API after first assistant response
        const { currentSession } = get();
        if (currentSession && 
            currentSession.title === 'New Chat' && 
            message.role === 'assistant' && 
            currentSession.messages.length >= 2) {
          // Generate title asynchronously
          chatApi.generateSessionTitle(currentSession.id)
            .then(response => {
              get().updateSessionTitle(currentSession.id, response.title);
            })
            .catch(error => {
              console.warn('Failed to generate session title:', error);
            });
        }
      },
      
      updateMessage: (messageId: string, updates: Partial<Message>) => {
        set(state => {
          const updatedMessages = state.messages.map(message =>
            message.id === messageId ? { ...message, ...updates } : message
          );
          
          const updatedCurrentSession = state.currentSession
            ? { ...state.currentSession, messages: updatedMessages, updatedAt: new Date() }
            : null;
          
          const updatedSessions = state.sessions.map(session =>
            session.id === updatedCurrentSession?.id ? updatedCurrentSession : session
          );
          
          return {
            messages: updatedMessages,
            currentSession: updatedCurrentSession,
            sessions: updatedSessions,
          };
        });
        
        get().saveSession();
      },
      
      deleteMessage: (messageId: string) => {
        set(state => {
          const updatedMessages = state.messages.filter(m => m.id !== messageId);
          const updatedCurrentSession = state.currentSession
            ? { ...state.currentSession, messages: updatedMessages, updatedAt: new Date() }
            : null;
          
          const updatedSessions = state.sessions.map(session =>
            session.id === updatedCurrentSession?.id ? updatedCurrentSession : session
          );
          
          return {
            messages: updatedMessages,
            currentSession: updatedCurrentSession,
            sessions: updatedSessions,
          };
        });
        
        get().saveSession();
      },
      
      // Session persistence
      saveSession: () => {
        // The persist middleware handles this automatically
        // This method is here for explicit saves if needed
      },
      
      loadSessions: async () => {
        set({ isLoadingSessions: true, error: null });
        
        try {
          const historyResponse = await chatApi.getChatHistory();
          
          // Ensure the response has the expected structure
          if (!historyResponse || !Array.isArray(historyResponse.sessions)) {
            throw new Error('Invalid response format from server');
          }
          
          // Convert summary to full sessions (we'll need to load individual sessions as needed)
          const sessionsFromBackend: ChatSession[] = historyResponse.sessions.map(summary => ({
            id: summary.id,
            title: summary.title,
            messages: [], // Will be loaded when session is opened
            createdAt: summary.createdAt ? new Date(summary.createdAt) : new Date(),
            updatedAt: summary.updatedAt ? new Date(summary.updatedAt) : new Date(),
            provider: summary.provider as LLMProvider,
            model: summary.model,
            mcpServers: [], // Will be loaded when session is opened
          }));
          
          // Merge with local sessions, preferring backend data
          set(state => {
            const currentSessions = Array.isArray(state.sessions) ? state.sessions : [];
            const mergedSessions = [...sessionsFromBackend];
            
            // Add any local sessions that aren't in backend
            currentSessions.forEach(localSession => {
              if (!sessionsFromBackend.find(s => s.id === localSession.id)) {
                mergedSessions.push(localSession);
              }
            });
            
            // Sort by updatedAt descending
            mergedSessions.sort((a, b) => {
              const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
              const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
              return bTime - aTime;
            });
            
            return { 
              sessions: mergedSessions,
              isLoadingSessions: false,
            };
          });
        } catch (error) {
          console.error('Failed to load sessions from backend:', error);
          set(state => ({ 
            isLoadingSessions: false,
            error: 'Failed to load chat history from server',
            // Ensure sessions remains an array even on error
            sessions: Array.isArray(state.sessions) ? state.sessions : [],
          }));
        }
      },
      
      initializeStore: async () => {
        await get().loadSessions();
      },
      
      // Tool call management
      setPendingToolCall: (toolCall: ToolCall | null) => {
        set({ pendingToolCall: toolCall });
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
      
      setError: (error: string | null) => {
        set({ error });
      },
      
      // Utility functions
      generateSessionTitle: (messages: Message[]): string => {
        return generateSessionTitle(messages);
      },
      
      clearCurrentSession: () => {
        set({
          currentSession: null,
          messages: [],
          pendingToolCall: null,
          isLoading: false,
        });
      },
    }),
    {
      name: 'chat-store',
      storage: createJSONStorage(() => localStorage),
      // Persist sessions and current session info
      partialize: (state) => ({
        sessions: Array.isArray(state.sessions) ? state.sessions : [],
        currentSession: state.currentSession,
        messages: state.messages || [],
      }),
      // Ensure restored data is valid
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!Array.isArray(state.sessions)) {
            state.sessions = [];
          }
          if (!Array.isArray(state.messages)) {
            state.messages = [];
          }
          // Reset loading states on rehydration
          state.isLoading = false;
          state.pendingToolCall = null;
          state.error = null;
        }
      },
    }
  )
);