import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type Theme = 'light' | 'dark' | 'system';

const ThemeToggle: React.FC = () => {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<Theme>('system');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('mcp-chat-ui-theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  // Apply theme to document with force
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    // Clear any existing theme classes first
    root.classList.remove('dark');
    
    // Force a reflow to ensure class removal takes effect
    root.offsetHeight;
    
    if (newTheme === 'dark') {
      root.classList.add('dark');
      // Force inline styles as backup
      root.style.backgroundColor = '#111827';
      root.style.color = '#f9fafb';
      console.log('🌙 Applied dark theme (forced)');
    } else if (newTheme === 'light') {
      // Ensure dark class is removed
      root.classList.remove('dark');
      // Force inline styles as backup
      root.style.backgroundColor = '#ffffff';
      root.style.color = '#1f2937';
      console.log('☀️ Applied light theme (forced)');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        root.style.backgroundColor = '#111827';
        root.style.color = '#f9fafb';
        console.log('🌙 Applied system dark theme (forced)');
      } else {
        root.classList.remove('dark');
        root.style.backgroundColor = '#ffffff';
        root.style.color = '#1f2937';
        console.log('☀️ Applied system light theme (forced)');
      }
    }
    
    // Force another reflow
    root.offsetHeight;
  };

  // Handle theme change
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('mcp-chat-ui-theme', newTheme);
    applyTheme(newTheme);
  };

  // Apply theme when component mounts or theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const themeOptions = [
    { value: 'light', label: t('themes.light', 'Light'), icon: '☀️' },
    { value: 'dark', label: t('themes.dark', 'Dark'), icon: '🌙' },
    { value: 'system', label: t('themes.system', 'System'), icon: '💻' }
  ];

  return (
    <div>
      <label htmlFor="theme-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('settings.theme', 'Theme')}
      </label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => handleThemeChange(e.target.value as Theme)}
        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      >
        {themeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.icon} {option.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {theme === 'system' 
          ? 'Theme follows your system preference (stored in browser)'
          : `Using ${theme} theme (stored in browser)`
        }
      </p>
    </div>
  );
};

export default ThemeToggle;