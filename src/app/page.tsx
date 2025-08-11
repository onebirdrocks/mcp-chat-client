'use client';

import { ChevronUp, Plus, Lock, Mic, Send, ChevronDown } from 'lucide-react';
import { useState } from 'react';

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
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left Sidebar */}
      {sidebarOpen && (
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h1 className="text-xl font-semibold">MCP-Chat-UI</h1>
            <button className="p-2 hover:bg-gray-700 rounded-lg">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          {/* Sidebar Content */}
          <div className="flex-1 p-4">
            <p className="text-gray-400 text-sm">
              Your conversations will appear here once you start chatting!
            </p>
          </div>
          
          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Guest</span>
              </div>
              <ChevronUp className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-6">
          {/* Left side - Toggle button, Plus button (when sidebar closed), and Chat Model */}
          <div className="flex items-center gap-4">
            <button 
              className="p-2 hover:bg-gray-700 rounded-lg"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <SidebarToggleIcon isOpen={sidebarOpen} />
            </button>
            
            {!sidebarOpen && (
              <button className="p-2 hover:bg-gray-700 rounded-lg">
                <Plus className="w-5 h-5" />
              </button>
            )}
            
            <div className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded-lg">
              <span className="text-sm">Chat model</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col justify-center items-center p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              Hello there! How can I help you today?
            </h2>
          </div>
          
          {/* Suggested Prompts Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-2xl mb-8">
            <div className="border border-gray-600 rounded-lg p-4 hover:bg-gray-800 cursor-pointer transition-colors">
              <p className="text-sm">Recommend some interesting books to read this summer</p>
            </div>
            <div className="border border-gray-600 rounded-lg p-4 hover:bg-gray-800 cursor-pointer transition-colors">
              <p className="text-sm">Suggest the best travel destinations for a family vacation</p>
            </div>
            <div className="border border-gray-600 rounded-lg p-4 hover:bg-gray-800 cursor-pointer transition-colors">
              <p className="text-sm">What's the weather forecast for New York this weekend?</p>
            </div>
            <div className="border border-gray-600 rounded-lg p-4 hover:bg-gray-800 cursor-pointer transition-colors">
              <p className="text-sm">What are the latest technology news and developments?</p>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className={`flex gap-4 bg-gray-800 rounded-xl p-5 border border-gray-600 ${isMultiLine ? 'items-end' : 'items-center'}`}>
              <button className={`p-2.5 hover:bg-gray-700 rounded-lg transition-colors ${isMultiLine ? 'self-end' : 'self-center'}`}>
                <Plus className="w-5 h-5 text-gray-400" />
              </button>
              <div className="flex-1 flex flex-col">
                <textarea
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Send a message..."
                  className="w-full bg-transparent outline-none text-white placeholder-gray-400 text-base py-2 resize-none min-h-[40px] max-h-[200px] leading-relaxed overflow-hidden"
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
              <button className={`p-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors ${isMultiLine ? 'self-end' : 'self-center'}`}>
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
          </div>
        </div>
      </div>
    </div>
  );
}
