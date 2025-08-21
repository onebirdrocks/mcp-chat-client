'use client';

import { ChevronUp, Plus, Lock, Mic, Send, ChevronDown, Globe, Sun, Moon, LogIn, ArrowLeft, ArrowDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTheme } from '@/hooks/useTheme';
import CreateChatModal from '@/components/chat/CreateChatModal';
import ChatMessage from '@/components/chat/ChatMessage';
import ConversationHistory from '@/components/chat/ConversationHistory';
import { simplifiedToolCallClient as toolCallClientService, ToolCall, ToolCallResult } from '@/lib/tool-call-client-simplified';

// Custom sidebar toggle icon component
const SidebarToggleIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
  >
    {/* Left panel (sidebar) */}
    <rect x="2" y="3" width="6" height="18" rx="1" fill="none" />
    {/* Right panel (main content) */}
    <rect x="10" y="3" width="12" height="18" rx="1" fill="none" />
  </svg>
);

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isMultiLine, setIsMultiLine] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [language, setLanguage] = useState('English');
  const [createChatModalOpen, setCreateChatModalOpen] = useState(false);
  const [chatState, setChatState] = useState<'idle' | 'chatting'>('idle');
  const [currentChat, setCurrentChat] = useState<{
    id: string;
    providerId: string;
    modelId: string;
    modelName: string;
    providerName: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  } | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    reasoningSteps?: string[];
    toolCalls?: ToolCall[];
    toolResults?: ToolCallResult[];
    toolStatus?: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  }>>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isWaitingForLLM, setIsWaitingForLLM] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { isDarkMode, toggleTheme } = useTheme();

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Auto-adjust textarea height
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    
    // Check if content has multiple lines or is long enough to wrap
    const lines = value.split('\n');
    const hasMultipleLines = lines.length > 1;
    const isLongText = value.length > 30; // Further lowered threshold
    
    // Also check if the textarea has grown beyond single line height
    const isVisuallyMultiLine = textarea.scrollHeight > 60; // Check if height is more than single line
    
    const shouldBeMultiLine = hasMultipleLines || isLongText || isVisuallyMultiLine;
    setIsMultiLine(shouldBeMultiLine);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      // Ctrl+Enter for new line
      e.preventDefault();
      const cursorPosition = e.currentTarget.selectionStart;
      const value = e.currentTarget.value;
      const newValue = value.slice(0, cursorPosition) + '\n' + value.slice(cursorPosition);
      setInputValue(newValue);
      setIsMultiLine(true);
    } else if (e.key === 'Enter' && !e.shiftKey && chatState === 'chatting' && !isStreaming) {
      // Enter to send message (when chatting and not streaming)
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentChat || isStreaming) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const prompt = inputValue.trim();
    setCurrentPrompt(prompt);
    setInputValue('');
    setIsMultiLine(false);
    setIsStreaming(true);
    
    // 发送消息时总是滚动到底部
    setTimeout(() => {
      scrollToBottom();
    }, 100);

    try {
      // 首先保存用户消息到数据库
      const saveResponse = await fetch(`/api/chats/${currentChat.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          showReasoning: showReasoning,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save message');
      }

      const saveData = await saveResponse.json();
      const assistantMessageId = saveData.assistantMessage.id;

      // 检查模型是否支持工具调用
      const supportsTools = await toolCallClientService.checkModelSupportsTools(
        currentChat.providerId,
        currentChat.modelId
      );

      if (supportsTools) {
        // 启用所有MCP服务器工具
        await toolCallClientService.enableAllMCPServerTools();
        
        // 获取可用工具
        const tools = await toolCallClientService.getAllAvailableTools();
        
        // 使用工具调用API
        const toolResponse = await toolCallClientService.callModelWithTools(
          currentChat.providerId,
          currentChat.modelId,
          userMessage.content,
          messages // 传递历史消息
        );
        
        if (toolResponse.toolCalls && toolResponse.toolCalls.length > 0) {
          // 添加包含工具调用的AI消息
          const assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant' as const,
            content: toolResponse.text,
            timestamp: new Date(),
            reasoningSteps: [],
            toolCalls: toolResponse.toolCalls,
            toolStatus: 'pending' as const,
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          setIsStreaming(false);
          return;
        }
      }

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: currentChat.id,
          message: userMessage.content,
          providerId: currentChat.providerId,
          modelId: currentChat.modelId,
          showReasoning: showReasoning,
          assistantMessageId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: '',
        timestamp: new Date(),
        reasoningSteps: [],
      };

      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        console.log('Received chunk:', chunk);
        
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          console.log('Processing line:', line);
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsStreaming(false);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              console.log('Parsed streaming data:', parsed);
              
              // 尝试不同的字段名
              const textContent = parsed.textDelta || parsed.content || parsed.text || parsed.delta || data;
              if (textContent && textContent !== data) {
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { 
                          ...msg, 
                          content: msg.content + textContent,
                          reasoningSteps: parsed.reasoningSteps || msg.reasoningSteps || []
                        }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error('Failed to parse streaming data:', e);
              console.log('Raw data:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
          reasoningSteps: [],
        }
      ]);
    } finally {
      setIsStreaming(false);
      setIsWaitingForLLM(false);
    }
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const handleLanguageChange = () => {
    setLanguage(language === 'English' ? '中文' : 'English');
  };

  const handleLogin = () => {
    // Handle login logic here
    console.log('Login clicked');
  };

  const handleBackToHome = () => {
    setChatState('idle');
    setCurrentChat(null);
    setSelectedConversationId(null);
    setMessages([]);
    setInputValue('');
  };

  const handleSelectConversation = async (conversation: any) => {
    try {
      const response = await fetch(`/api/chats/${conversation.id}`);
      if (response.ok) {
        const data = await response.json();
        
        setCurrentChat({
          id: data.id,
          providerId: data.providerId,
          modelId: data.modelId,
          modelName: data.modelName,
          providerName: data.providerName,
          systemPrompt: data.systemPrompt,
          temperature: data.temperature,
          maxTokens: data.maxTokens,
          topP: data.topP,
          frequencyPenalty: data.frequencyPenalty,
          presencePenalty: data.presencePenalty
        });
        
        setSelectedConversationId(data.id);
        setMessages(data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          reasoningSteps: msg.reasoningSteps ? 
            (typeof msg.reasoningSteps === 'string' ? JSON.parse(msg.reasoningSteps) : msg.reasoningSteps) 
            : undefined
        })));
        setChatState('chatting');
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleCreateChat = () => {
    setCreateChatModalOpen(true);
  };

  // 处理工具调用确认
  const handleToolCallConfirm = async (messageId: string, confirmedTools: ToolCall[]) => {
    // 检查是否已经有工具执行结果
    const message = messages.find(m => m.id === messageId);
    const hasExistingResults = message?.toolResults && message.toolResults.length > 0;
    
    if (hasExistingResults) {
      // 如果已经有工具执行结果，直接使用现有结果调用LLM
      console.log('Using existing tool results for LLM call');
      
      // 更新消息状态为处理中
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, toolStatus: 'executing' as const }
          : m
      ));
      
      // 设置等待LLM状态
      console.log('🔄 设置 isWaitingForLLM = true');
      setIsWaitingForLLM(true);
      
      try {
        // 创建AI回复消息占位符
        const aiResponseMessageId = (Date.now() + 1).toString();
        const aiResponseMessage = {
          id: aiResponseMessageId,
          role: 'assistant' as const,
          content: '',
          timestamp: new Date(),
        };
        
        // 添加AI回复消息占位符
        setMessages(prev => [...prev, aiResponseMessage]);
        
        // 继续对话，使用现有的工具结果（流式）
        const response = await toolCallClientService.continueConversationWithToolResults(
          currentChat!.providerId,
          currentChat!.modelId,
          currentPrompt,
          messages, // 传递历史消息
          message!.toolResults!
        );
        
        // 更新工具调用消息的状态
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { 
                ...m, 
                toolStatus: message!.toolResults!.some(r => !r.success) ? 'failed' as const : 'completed' as const
              }
            : m
        ));
      } catch (error) {
        console.error('Error calling LLM with existing tool results:', error);
        
        // 更新消息的状态为失败
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, toolStatus: 'failed' as const }
            : m
        ));
      } finally {
        setIsStreaming(false);
        console.log('🔄 设置 isWaitingForLLM = false');
        setIsWaitingForLLM(false);
      }
    } else {
      // 如果没有工具执行结果，执行工具调用（传统流程）
      console.log('Executing tools for the first time');
      
      // 更新消息的状态为执行中
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, toolStatus: 'executing' as const }
          : m
      ));
      
      try {
        // 执行工具调用
        const results = await toolCallClientService.executeToolCalls(confirmedTools);
        
        // 继续对话
        const response = await toolCallClientService.continueConversationWithToolResults(
          currentChat!.providerId,
          currentChat!.modelId,
          currentPrompt,
          messages, // 传递历史消息
          results
        );
        
        // 更新工具调用消息的状态和结果
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { 
                ...m, 
                toolResults: results,
                toolStatus: results.some(r => !r.success) ? 'failed' as const : 'completed' as const
              }
            : m
        ));
        
        // 添加AI的回复作为新消息
        if (response && response.trim()) {
          const aiResponseMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant' as const,
            content: response,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, aiResponseMessage]);
        }
      } catch (error) {
        console.error('Error handling tool calls:', error);
        
        // 更新消息的状态为失败
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, toolStatus: 'failed' as const }
            : m
        ));
      } finally {
        setIsStreaming(false);
        setIsWaitingForLLM(false);
      }
    }
  };

  // 处理单个工具执行
  const handleExecuteSingleTool = async (messageId: string, toolCall: ToolCall) => {
    try {
      // 执行单个工具调用
      const results = await toolCallClientService.executeToolCalls([toolCall]);
      
      // 更新消息的工具结果
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { 
              ...m, 
              toolResults: [...(m.toolResults || []), ...results]
            }
          : m
      ));
      
      console.log(`Tool ${toolCall.toolName} executed successfully`);
    } catch (error) {
      console.error(`Error executing tool ${toolCall.toolName}:`, error);
      
      // 更新消息的工具结果（包含错误）
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { 
              ...m, 
              toolResults: [...(m.toolResults || []), {
                toolCallId: toolCall.id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              }]
            }
          : m
      ));
    }
  };

  // 处理工具调用取消
  const handleToolCallCancel = (messageId: string) => {
    setIsStreaming(false);
    
    // 更新消息的状态为已取消
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { 
            ...m, 
            toolStatus: 'cancelled' as const,
            content: 'Tool execution was cancelled by the user.'
          }
        : m
    ));
  };

  // 重试工具调用
  const handleRetryTools = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.toolCalls) return;

    // 更新消息状态为执行中
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, toolStatus: 'executing' as const }
        : m
    ));

    // 设置等待LLM状态
    setIsWaitingForLLM(true);

    try {
      // 重新执行工具调用
      const results = await toolCallClientService.executeToolCalls(message.toolCalls);
      
      // 创建AI回复消息占位符
      const aiResponseMessageId = (Date.now() + 1).toString();
      const aiResponseMessage = {
        id: aiResponseMessageId,
        role: 'assistant' as const,
        content: '',
        timestamp: new Date(),
      };
      
      // 添加AI回复消息占位符
      setMessages(prev => [...prev, aiResponseMessage]);
      
      // 继续对话（流式）
      const response = await toolCallClientService.continueConversationWithToolResults(
        currentChat!.providerId,
        currentChat!.modelId,
        currentPrompt,
        messages, // 传递历史消息
        results
      );
      
      // 实时更新AI回复内容
      setMessages(prev => prev.map(m => 
        m.id === aiResponseMessageId 
          ? { ...m, content: response }
          : m
      ));
      
      // 更新工具调用消息的状态和结果
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { 
              ...m, 
              toolResults: results,
              toolStatus: results.some(r => !r.success) ? 'failed' as const : 'completed' as const
            }
          : m
      ));
    } catch (error) {
      console.error('Error retrying tools:', error);
      
      // 更新消息状态为失败
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, toolStatus: 'failed' as const }
          : m
      ));
    } finally {
      setIsStreaming(false);
      setIsWaitingForLLM(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkIfNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100; // 距离底部100px以内认为是"接近底部"
    const isNear = scrollHeight - scrollTop - clientHeight < threshold;
    setIsNearBottom(isNear);
  };

  const handleScroll = () => {
    checkIfNearBottom();
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useEffect(() => {
    // 只有在接近底部时才自动滚动
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages, isNearBottom]);

  const handleChatCreated = (chatData: {
    id: string;
    providerId: string;
    modelId: string;
    modelName: string;
    providerName: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  }) => {
    setCurrentChat(chatData);
    setChatState('chatting');
    setMessages([]);
    setCreateChatModalOpen(false);
  };

  return (
    <div className={`flex h-screen text-white transition-colors ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Left Sidebar */}
      {sidebarOpen && (
        <div className={`w-80 border-r flex flex-col ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {/* Sidebar Header */}
          <div className={`p-4 border-b flex items-center justify-between ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <h1 className={`text-xl font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>MCP-Chat-UI</h1>
            <button
              onClick={handleCreateChat}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}>
              <Plus className={`w-5 h-5 ${
                isDarkMode ? 'text-white' : 'text-gray-600'
              }`} />
            </button>
          </div>
          
          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto">
            <ConversationHistory
              onSelectConversation={handleSelectConversation}
              currentConversationId={selectedConversationId || undefined}
            />
          </div>
          
          {/* Sidebar Footer */}
          <div className={`p-4 border-t relative ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Guest</span>
              </div>
              <button 
                onClick={toggleUserMenu}
                className={`p-1 rounded transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <ChevronUp className={`w-4 h-4 transition-transform ${
                  userMenuOpen ? 'rotate-180' : ''
                } ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </button>
            </div>
            
            {/* User Dropdown Menu */}
            {userMenuOpen && (
              <div ref={userMenuRef} className={`absolute bottom-full left-0 right-0 mb-2 rounded-lg shadow-lg border overflow-hidden ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="py-1">
                  <button 
                    onClick={handleLanguageChange}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                      isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    {language === 'English' ? 'Switch to 中文' : 'Switch to English'}
                  </button>
                  <div className={`border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></div>
                  <button 
                    onClick={toggleTheme}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                      isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  </button>
                  <div className={`border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></div>
                  <button 
                    onClick={handleLogin}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                      isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    Login to your account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className={`h-14 border-b flex items-center justify-between px-4 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {/* Left side - Toggle button, Plus button (when sidebar closed), and Chat Model */}
          <div className="flex items-center gap-3">
            <button
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <SidebarToggleIcon isOpen={sidebarOpen} />
            </button>
            
            {!sidebarOpen && (
              <button
                onClick={handleCreateChat}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}>
                <Plus className={`w-5 h-5 ${
                  isDarkMode ? 'text-white' : 'text-gray-600'
                }`} />
              </button>
            )}
            
            {chatState === 'idle' && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <span className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Chat model</span>
                <ChevronDown className={`w-4 h-4 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </div>
            )}
            
            {chatState === 'chatting' && currentChat && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <span className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {currentChat.modelName}
                </span>
                <span className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  ({currentChat.providerName})
                </span>
              </div>
            )}
          </div>

          {/* Right side - Settings button */}
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <button className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`w-4 h-4 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </Link>
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              {isDarkMode ? (
                <Sun className={`w-4 h-4 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
              ) : (
                <Moon className={`w-4 h-4 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
              )}
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {chatState === 'idle' ? (
            <div className="flex flex-col justify-center items-center p-8">
              <div className="text-center mb-8 max-w-4xl mx-auto">
                <h2 className={`text-3xl font-semibold mb-6 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Hello there! How can I help you today?
                </h2>
                <p className={`text-lg ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Choose a suggestion below or start typing to begin our conversation.
                </p>
              </div>
              
              {/* Suggested Prompts Grid */}
              <div className="grid grid-cols-2 gap-6 max-w-4xl mb-8">
                <div className={`border rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isDarkMode 
                    ? 'border-gray-600 hover:bg-gray-800 hover:border-gray-500' 
                    : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}>
                  <p className={`text-base font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Recommend some interesting books to read this summer</p>
                </div>
                <div className={`border rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isDarkMode 
                    ? 'border-gray-600 hover:bg-gray-800 hover:border-gray-500' 
                    : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}>
                  <p className={`text-base font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Help me plan a weekend trip</p>
                </div>
                <div className={`border rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isDarkMode 
                    ? 'border-gray-600 hover:bg-gray-800 hover:border-gray-500' 
                    : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}>
                  <p className={`text-base font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Write a creative story about a magical forest</p>
                </div>
                <div className={`border rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isDarkMode 
                    ? 'border-gray-600 hover:bg-gray-800 hover:border-gray-500' 
                    : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}>
                  <p className={`text-base font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Explain quantum computing in simple terms</p>
                </div>
              </div>
            </div>
          ) : (
            /* Chat Interface */
            <div className="flex flex-col h-full min-h-0">
              {/* Chat Header - Only show when streaming */}
              {isStreaming && (
                <div className={`flex items-center justify-end px-6 py-3 border-b flex-shrink-0 ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Thinking...
                    </span>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto min-h-0 relative">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className={`text-lg ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Start a conversation with {currentChat?.modelName}
                    </p>
                  </div>
                ) : (
                  <div className="max-w-7xl mx-auto">
                    {messages.map((message) => {
                      if (message.toolCalls) {
                        console.log(`🔍 page.tsx: 传递 isWaitingForLLM = ${isWaitingForLLM} 给消息 ${message.id}`);
                      }
                      return (
                        <ChatMessage
                          key={message.id}
                          role={message.role}
                          content={message.content}
                          timestamp={message.timestamp}
                          reasoningSteps={message.reasoningSteps}
                          toolCalls={message.toolCalls}
                          toolResults={message.toolResults}
                          toolStatus={message.toolStatus}
                          onRetryTools={() => handleRetryTools(message.id)}
                          onConfirmToolCalls={(toolCalls) => handleToolCallConfirm(message.id, toolCalls)}
                          onCancelToolCalls={() => handleToolCallCancel(message.id)}
                          onExecuteSingleTool={(toolCall) => handleExecuteSingleTool(message.id, toolCall)}
                          isWaitingForLLM={isWaitingForLLM}
                        />
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
                
                {/* Scroll to bottom button */}
                {!isNearBottom && messages.length > 0 && (
                  <button
                    onClick={scrollToBottom}
                    className={`absolute bottom-4 right-4 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 ${
                      isDarkMode 
                        ? 'bg-gray-700 text-white hover:bg-gray-600' 
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                    title="Scroll to bottom"
                  >
                    <ArrowDown className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        {chatState === 'idle' ? (
          <div className="p-6 flex-shrink-0">
            <div className="max-w-7xl mx-auto">
              <div className={`flex gap-4 rounded-xl p-5 border ${isMultiLine ? 'items-end' : 'items-center'} ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600' 
                  : 'bg-white border-gray-300'
              }`}>
                <button className={`p-2.5 rounded-lg transition-colors ${isMultiLine ? 'self-end' : 'self-center'} ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}>
                  <Plus className={`w-5 h-5 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                </button>
                <div className="flex-1 flex flex-col">
                  <textarea
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Send a message..."
                    className={`w-full bg-transparent outline-none text-base py-2 resize-none min-h-[40px] max-h-[200px] leading-relaxed overflow-hidden ${
                      isDarkMode 
                        ? 'text-white placeholder-gray-400' 
                        : 'text-gray-900 placeholder-gray-500'
                    }`}
                    rows={1}
                    style={{ 
                      minHeight: '40px',
                      height: 'auto'
                    }}
                  />
                  {isMultiLine && (
                    <div className="h-10 flex-shrink-0"></div>
                  )}
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isStreaming}
                  className={`p-2.5 rounded-lg transition-colors ${isMultiLine ? 'self-end' : 'self-center'} ${
                    inputValue.trim() && !isStreaming
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : isDarkMode
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5 text-white"
                  >
                    <path d="m22 2-7 20-4-9-9-4 20-7z"/>
                  </svg>
                </button>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {isStreaming ? 'AI is responding... Press Enter to send, Ctrl+Enter for new line' : 'Press Enter to send, Ctrl+Enter for new line'}
                </p>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={showReasoning}
                    onChange={(e) => setShowReasoning(e.target.checked)}
                    className="w-3 h-3"
                  />
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                    Show reasoning
                  </span>
                </label>
              </div>
            </div>
          </div>
        ) : (
          /* Chat Input */
          <div className="p-6 flex-shrink-0">
            <div className="max-w-7xl mx-auto">
              <div className={`flex gap-4 rounded-xl p-5 border ${isMultiLine ? 'items-end' : 'items-center'} ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600' 
                  : 'bg-white border-gray-300'
              }`}>
                {/* 聊天状态下不显示 Plus 按钮，保持布局一致 */}
                <div className="w-10 h-10 flex-shrink-0"></div>
                <div className="flex-1 flex flex-col">
                  <textarea
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Send a message..."
                    className={`w-full bg-transparent outline-none text-base py-2 resize-none min-h-[40px] max-h-[200px] leading-relaxed overflow-hidden ${
                      isDarkMode 
                        ? 'text-white placeholder-gray-400' 
                        : 'text-gray-900 placeholder-gray-500'
                    }`}
                    rows={1}
                    style={{ 
                      minHeight: '40px',
                      height: 'auto'
                    }}
                  />
                  {isMultiLine && (
                    <div className="h-10 flex-shrink-0"></div>
                  )}
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isStreaming}
                  className={`p-2.5 rounded-lg transition-colors ${isMultiLine ? 'self-end' : 'self-center'} ${
                    inputValue.trim() && !isStreaming
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : isDarkMode
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5 text-white"
                  >
                    <path d="m22 2-7 20-4-9-9-4 20-7z"/>
                  </svg>
                </button>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {isStreaming ? 'AI is responding... Press Enter to send, Ctrl+Enter for new line' : 'Press Enter to send, Ctrl+Enter for new line'}
                </p>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={showReasoning}
                    onChange={(e) => setShowReasoning(e.target.checked)}
                    className="w-3 h-3"
                  />
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                    Show reasoning
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Chat Modal */}
      <CreateChatModal
        isOpen={createChatModalOpen}
        onClose={() => setCreateChatModalOpen(false)}
        onChatCreated={handleChatCreated}
      />
    </div>
  );
}