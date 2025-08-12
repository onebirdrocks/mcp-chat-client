'use client';

import { ArrowLeft, Sun, Moon, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/hooks/useTheme';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isDarkMode, toggleTheme } = useTheme();
  const pathname = usePathname();

  const settingsTabs = [
    { name: 'Account', path: '/settings/account' },
    { name: 'LLM Providers', path: '/settings/llms' },
    { name: 'Models', path: '/settings/models' },
    { name: 'MCP Servers', path: '/settings/mcps' },
    { name: 'Customization', path: '/settings/customization' },
    { name: 'History & Sync', path: '/settings/history' },
    { name: 'Attachments', path: '/settings/attachments' },
    { name: 'Contact Us', path: '/settings/contact' },
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Top Bar */}
      <div className={`h-16 border-b flex items-center justify-between px-6 ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-4">
          <Link 
            href="/"
            className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className={`w-4 h-4 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <span className={`text-sm ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>Back to Chat</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
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
          <button className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
            isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          }`}>
            <LogOut className={`w-4 h-4 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <span className={`text-sm ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>Sign out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Left Sidebar - Account Info */}
        <div className={`w-80 border-r p-6 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {/* User Profile */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="text-white text-xl">🐦</span>
            </div>
            <h3 className={`font-semibold mb-1 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Ruan Yiming</h3>
            <p className={`text-sm mb-3 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>ymruan@gmail.com</p>
            <button className={`px-3 py-1 rounded-full text-sm ${
              isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
            }`}>
              Free Plan
            </button>
          </div>

          {/* Message Usage */}
          <div className={`mb-6 p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <h4 className={`font-medium mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Message Usage</h4>
            <p className={`text-xs mb-2 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>Resets tomorrow at 7:59 AM</p>
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Standard</span>
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>0/20</span>
              </div>
              <div className={`w-full bg-gray-600 rounded-full h-2 ${
                isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
              }`}>
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
            <p className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>20 messages remaining</p>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h4 className={`font-medium mb-3 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Keyboard Shortcuts</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Search</span>
                <kbd className={`px-2 py-1 text-xs rounded ${
                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>⌘ Shift S</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>New Chat</span>
                <kbd className={`px-2 py-1 text-xs rounded ${
                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>⌘ Shift N</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Toggle Sidebar</span>
                <kbd className={`px-2 py-1 text-xs rounded ${
                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>⌘ B</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Settings Tabs */}
          <div className={`border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex px-6">
              {settingsTabs.map((tab) => (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    pathname === tab.path
                      ? isDarkMode 
                        ? 'border-blue-500 text-blue-400' 
                        : 'border-blue-600 text-blue-600'
                      : isDarkMode
                        ? 'border-transparent text-gray-400 hover:text-gray-300'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
