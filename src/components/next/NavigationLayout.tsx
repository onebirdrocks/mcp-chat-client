'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '../ui';
import { Sidebar } from './Sidebar';

interface NavigationLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const NavigationLayout: React.FC<NavigationLayoutProps> = ({
  children,
  className = '',
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  
  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + B to toggle sidebar
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        setSidebarOpen(!sidebarOpen);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);
  
  return (
    <div className={`flex min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen || !isMobile} // Always open on desktop
        onClose={() => setSidebarOpen(false)}
      />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header with menu button */}
        {isMobile && (
          <header className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                className="p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
              
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                MCP Chat UI
              </h1>
              
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
          </header>
        )}
        
        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default NavigationLayout;