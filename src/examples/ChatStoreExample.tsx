import React, { useState } from 'react';
import { useChat } from '../hooks/useChat';
import { Button, Input, Card } from '../components/ui';

/**
 * Example component demonstrating how to use the chat store
 * This shows the basic chat functionality without the full UI
 */
export const ChatStoreExample: React.FC = () => {
  const {
    currentSession,
    messages,
    isLoading,
    pendingToolCall,
    sessions,
    hasActiveSession,
    canSendMessage,
    startNewChat,
    sendChatMessage,
    executeToolCall,
    rejectToolCall,
    switchToSession,
    removeSession,
  } = useChat();

  const [messageInput, setMessageInput] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'deepseek' | 'openrouter'>('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4');

  const handleStartNewChat = () => {
    startNewChat(selectedProvider, selectedModel);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !canSendMessage) return;
    
    try {
      await sendChatMessage(messageInput);
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleExecuteTool = async () => {
    if (!pendingToolCall) return;
    
    try {
      await executeToolCall(pendingToolCall);
    } catch (error) {
      console.error('Failed to execute tool:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Chat Store Example</h1>
      
      {/* Session Controls */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Session Controls</h2>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as any)}
              className="border rounded px-3 py-2"
            >
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Model</label>
            <Input
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              placeholder="Model name"
            />
          </div>
          <Button onClick={handleStartNewChat}>
            Start New Chat
          </Button>
        </div>
        
        {currentSession && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <p><strong>Current Session:</strong> {currentSession.title}</p>
            <p><strong>Provider:</strong> {currentSession.provider}</p>
            <p><strong>Model:</strong> {currentSession.model}</p>
            <p><strong>Messages:</strong> {messages.length}</p>
          </div>
        )}
      </Card>

      {/* Chat History */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Chat History ({sessions.length} sessions)</h2>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-2 border rounded cursor-pointer flex justify-between items-center ${
                currentSession?.id === session.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
              }`}
            >
              <div onClick={() => switchToSession(session.id)}>
                <p className="font-medium">{session.title}</p>
                <p className="text-sm text-gray-500">
                  {session.provider} • {session.messages.length} messages
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeSession(session.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Chat Interface */}
      {hasActiveSession && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Chat Messages</h2>
          
          {/* Messages */}
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded ${
                  message.role === 'user'
                    ? 'bg-blue-100 ml-8'
                    : message.role === 'assistant'
                    ? 'bg-gray-100 mr-8'
                    : message.role === 'tool'
                    ? 'bg-green-100 mx-4'
                    : 'bg-yellow-100 mx-4'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm capitalize">{message.role}</p>
                    <p className="mt-1">{message.content}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                
                {message.toolCalls && (
                  <div className="mt-2 p-2 bg-white rounded border">
                    <p className="text-sm font-medium">Tool Calls:</p>
                    {message.toolCalls.map((toolCall) => (
                      <div key={toolCall.id} className="text-sm">
                        <code>{toolCall.function.name}({toolCall.function.arguments})</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="p-3 bg-gray-100 mr-8 rounded">
                <p className="text-gray-600">AI is thinking...</p>
              </div>
            )}
          </div>

          {/* Tool Confirmation */}
          {pendingToolCall && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="font-semibold text-yellow-800">Tool Execution Required</h3>
              <p className="mt-1">
                The AI wants to execute: <code>{pendingToolCall.function.name}</code>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Arguments: <code>{pendingToolCall.function.arguments}</code>
              </p>
              <div className="flex gap-2 mt-3">
                <Button onClick={handleExecuteTool} variant="primary">
                  Execute Tool
                </Button>
                <Button onClick={rejectToolCall} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={!canSendMessage}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!canSendMessage || !messageInput.trim()}
            >
              Send
            </Button>
          </div>
        </Card>
      )}

      {!hasActiveSession && (
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">No active chat session</p>
          <p className="text-sm text-gray-500">Start a new chat to begin messaging</p>
        </Card>
      )}
    </div>
  );
};