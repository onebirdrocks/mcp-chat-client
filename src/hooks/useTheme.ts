import { useEffect, useState } from 'react';
import type { Theme } from '../types';

/**
 * Theme management hook that handles theme application and persistence
 * Themes (light/dark/system) are stored in localStorage (browser-specific)
 * while API keys and MCP servers are stored in backend configuration files
 */
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('mcp-chat-ui-theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
    } else {
      // Default to system theme
      setTheme('system');
    }
  }, []);

  // Apply theme to document and resolve system theme
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      
      let effectiveTheme: 'light' | 'dark';
      
      if (theme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        effectiveTheme = theme;
      }
      
      // Apply theme class
      if (effectiveTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      setResolvedTheme(effectiveTheme);
    };

    applyTheme();

    // Listen for system theme changes when using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Change theme and persist to localStorage
  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('mcp-chat-ui-theme', newTheme);
  };

  return {
    theme,
    resolvedTheme,
    changeTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
  };
};

/**
 * Initialize theme on app startup
 */
export const initializeTheme = () => {
  const savedTheme = localStorage.getItem('mcp-chat-ui-theme') as Theme;
  const theme = savedTheme && ['light', 'dark', 'system'].includes(savedTheme) ? savedTheme : 'system';
  
  const root = document.documentElement;
  
  let effectiveTheme: 'light' | 'dark';
  
  if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    effectiveTheme = theme;
  }
  
  // Apply theme class immediately
  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};