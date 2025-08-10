'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/hooks/useTheme';
import { useSettingsStore } from '../../src/store/settingsStore';
import type { Theme } from '../../src/types';

interface ThemeSelectorProps {
  className?: string;
  variant?: 'dropdown' | 'buttons' | 'icons';
  showLabel?: boolean;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ 
  className = '', 
  variant = 'dropdown',
  showLabel = true 
}) => {
  const { t } = useTranslation();
  const { theme, changeTheme } = useTheme();
  const { updatePreferences } = useSettingsStore();

  const handleThemeChange = (newTheme: Theme) => {
    changeTheme(newTheme);
    updatePreferences({ theme: newTheme });
  };

  const themes = [
    { 
      value: 'light' as Theme, 
      label: t('themes.light', 'Light'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    { 
      value: 'dark' as Theme, 
      label: t('themes.dark', 'Dark'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )
    },
    { 
      value: 'system' as Theme, 
      label: t('themes.system', 'System'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    }
  ];

  if (variant === 'icons') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('settings.theme', 'Theme')}:
          </span>
        )}
        <div className="flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
          {themes.map((themeOption) => (
            <button
              key={themeOption.value}
              onClick={() => handleThemeChange(themeOption.value)}
              className={`
                p-2 transition-colors
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                ${theme === themeOption.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
                ${themeOption.value !== themes[themes.length - 1].value ? 'border-r border-gray-300 dark:border-gray-600' : ''}
              `}
              aria-pressed={theme === themeOption.value}
              aria-label={`Switch to ${themeOption.label} theme`}
              title={themeOption.label}
            >
              {themeOption.icon}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'buttons') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('settings.theme', 'Theme')}:
          </span>
        )}
        <div className="flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
          {themes.map((themeOption) => (
            <button
              key={themeOption.value}
              onClick={() => handleThemeChange(themeOption.value)}
              className={`
                px-3 py-1 text-sm font-medium transition-colors flex items-center space-x-1
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                ${theme === themeOption.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
                ${themeOption.value !== themes[themes.length - 1].value ? 'border-r border-gray-300 dark:border-gray-600' : ''}
              `}
              aria-pressed={theme === themeOption.value}
              aria-label={`Switch to ${themeOption.label} theme`}
            >
              {themeOption.icon}
              <span>{themeOption.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showLabel && (
        <label 
          htmlFor="theme-selector"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t('settings.theme', 'Theme')}:
        </label>
      )}
      <div className="relative">
        <select
          id="theme-selector"
          value={theme}
          onChange={(e) => handleThemeChange(e.target.value as Theme)}
          className="
            block w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 
            rounded-md shadow-sm bg-white dark:bg-gray-800 
            text-gray-900 dark:text-gray-100 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            appearance-none cursor-pointer
          "
          aria-label="Select theme"
        >
          {themes.map((themeOption) => (
            <option key={themeOption.value} value={themeOption.value}>
              {themeOption.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg 
            className="w-4 h-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;