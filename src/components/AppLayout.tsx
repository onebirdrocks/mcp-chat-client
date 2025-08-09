import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui';
import Sidebar from './Sidebar';
import { useClickOutside } from '../hooks/useClickOutside';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar when clicking outside
  useClickOutside(
    sidebarRef,
    () => setSidebarOpen(false),
    sidebarOpen,
    [
      '[aria-label*="Open menu"]',
      '[aria-label*="打开菜单"]',
      '[data-sidebar-trigger]'
    ]
  );

  // Handle overlay click for mobile
  const handleOverlayClick = () => {
    setSidebarOpen(false);
  };

  // Navigation items configuration
  const navigationItems = [
    {
      path: '/chat',
      label: t('navigation.chat', 'Chat'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      path: '/settings',
      label: t('navigation.settings', 'Settings'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  // Get current page title
  const getCurrentPageTitle = () => {
    const currentItem = navigationItems.find(item => item.path === location.pathname);
    return currentItem?.label || t('app.title', 'MCP Chat UI');
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Skip links for keyboard navigation */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg"
      >
        {t('accessibility.skipToMain', 'Skip to main content')}
      </a>
      <a 
        href="#sidebar-navigation" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-32 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg"
      >
        {t('accessibility.skipToNavigation', 'Skip to navigation')}
      </a>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={handleOverlayClick}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75 transition-opacity"></div>
        </div>
      )}

      {/* Sidebar */}
      <aside 
        ref={sidebarRef}
        id="sidebar-navigation"
        className={`
          fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0 lg:w-80
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label={t('navigation.sidebar', 'Sidebar navigation')}
      >
        {location.pathname === '/chat' ? (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        ) : (
          <div className="flex flex-col h-full">
            {/* Sidebar header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('app.title', 'MCP Chat UI')}
              </h1>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-label={t('common.close', 'Close')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            {/* Sidebar content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Navigation */}
              <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                {/* Navigation Links */}
                <div className="space-y-1">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                        location.pathname === item.path
                          ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      aria-current={location.pathname === item.path ? 'page' : undefined}
                    >
                      <span className="mr-3 flex-shrink-0">
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </nav>

              {/* Sidebar footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t('app.version', 'Version 1.0.0')}
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar for mobile */}
        <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              aria-label={t('common.openMenu', 'Open menu')}
              className="p-2 -ml-2 flex-shrink-0"
              data-sidebar-trigger
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate px-2 min-w-0">
              {getCurrentPageTitle()}
            </h1>
            <div className="w-10 flex justify-end flex-shrink-0">
              <Link to="/settings">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t('navigation.settings', 'Settings')}
                  className="p-2"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main 
          ref={mainContentRef}
          id="main-content"
          className="flex-1 overflow-hidden bg-white dark:bg-gray-900"
          role="main"
          aria-label={t('navigation.mainContent', 'Main content')}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;