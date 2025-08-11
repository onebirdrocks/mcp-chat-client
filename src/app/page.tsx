'use client';

import { ChevronUp, Plus, Lock, Mic, Send, ChevronDown, Globe, Sun, Moon, LogIn } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTheme } from '@/hooks/useTheme';

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [language, setLanguage] = useState('English');
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
            <button className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}>
              <Plus className={`w-5 h-5 ${
                isDarkMode ? 'text-white' : 'text-gray-600'
              }`} />
            </button>
          </div>
          
          {/* Sidebar Content */}
          <div className="flex-1 p-4">
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Your conversations will appear here once you start chatting!
            </p>
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
              <button className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}>
                <Plus className={`w-5 h-5 ${
                  isDarkMode ? 'text-white' : 'text-gray-600'
                }`} />
              </button>
            )}
            
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
        <div className="flex-1 flex flex-col justify-center items-center p-8">
          <div className="text-center mb-8">
            <h2 className={`text-2xl font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Hello there! How can I help you today?
            </h2>
          </div>
          
          {/* Suggested Prompts Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-2xl mb-8">
            <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              isDarkMode 
                ? 'border-gray-600 hover:bg-gray-800' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}>
              <p className={`text-sm ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Recommend some interesting books to read this summer</p>
            </div>
            <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              isDarkMode 
                ? 'border-gray-600 hover:bg-gray-800' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}>
              <p className={`text-sm ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Suggest the best travel destinations for a family vacation</p>
            </div>
            <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              isDarkMode 
                ? 'border-gray-600 hover:bg-gray-800' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}>
              <p className={`text-sm ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>What&apos;s the weather forecast for New York this weekend?</p>
            </div>
            <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              isDarkMode 
                ? 'border-gray-600 hover:bg-gray-800' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}>
              <p className={`text-sm ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>What are the latest technology news and developments?</p>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
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
              <button className={`p-2.5 rounded-lg transition-colors ${isMultiLine ? 'self-end' : 'self-center'} bg-blue-600 hover:bg-blue-700`}>
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
