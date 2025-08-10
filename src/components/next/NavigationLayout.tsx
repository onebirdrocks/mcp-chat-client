'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '../ui';
import { Sidebar } from './Sidebar';
import { useResponsive, useTouchDevice, useOrientation } from '../../hooks/useResponsive';

interface NavigationLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const NavigationLayout: React.FC<NavigationLayoutProps> = ({
  children,
  className = '',
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  
  // Responsive hooks
  const { isMobile, isTablet, isDesktop, currentBreakpoint } = useResponsive();
  const isTouch = useTouchDevice();
  const orientation = useOrientation();
  
  // Auto-open sidebar on desktop, close on mobile
  useEffect(() => {
    if (isDesktop && !sidebarOpen) {
      setSidebarOpen(true);
    } else if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isDesktop, isMobile]);
  
  // Close sidebar on route change (mobile/tablet only)
  useEffect(() => {
    if ((isMobile || isTablet) && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile, isTablet]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + B to toggle sidebar
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        setSidebarOpen(!sidebarOpen);
      }
      
      // Escape to close sidebar on mobile
      if (event.key === 'Escape' && (isMobile || isTablet) && sidebarOpen) {
        event.preventDefault();
        setSidebarOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, isMobile, isTablet]);
  
  // Handle touch gestures for mobile sidebar
  useEffect(() => {
    if (!isTouch || !isMobile) return;

    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      isDragging = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;
      
      // Prevent default scrolling when swiping from edge
      if (startX < 20 && currentX > startX + 50) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      
      const deltaX = currentX - startX;
      
      // Swipe right from left edge to open sidebar
      if (startX < 20 && deltaX > 50 && !sidebarOpen) {
        setSidebarOpen(true);
      }
      // Swipe left to close sidebar
      else if (deltaX < -50 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isTouch, isMobile, sidebarOpen]);

  return (
    <div 
      className={`flex min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}
      data-breakpoint={currentBreakpoint}
      data-orientation={orientation}
      data-touch={isTouch}
    >
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
        isTablet={isTablet}
        isTouch={isTouch}
      />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile/Tablet header with menu button */}
        {(isMobile || isTablet) && (
          <header className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-2 sm:py-3 sticky top-0 z-30">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                className="p-2 touch-manipulation"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
              
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                MCP Chat UI
              </h1>
              
              {/* Touch-friendly action buttons for mobile */}
              <div className="flex items-center gap-1 sm:gap-2">
                {isTouch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = '/settings'}
                    aria-label="Settings"
                    className="p-2 touch-manipulation"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                  </Button>
                )}
              </div>
            </div>
            
            {/* Swipe indicator for mobile */}
            {isMobile && !sidebarOpen && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r opacity-30 animate-pulse" />
            )}
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