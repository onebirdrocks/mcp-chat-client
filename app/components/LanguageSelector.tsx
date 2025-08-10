'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/hooks/useLanguage';
import type { Language } from '../../src/types';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'dropdown' | 'buttons';
  showLabel?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  className = '', 
  variant = 'dropdown',
  showLabel = true 
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { currentLanguage, changeLanguage, supportedLanguages, getLanguageName } = useLanguage();
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageChange = async (newLanguage: Language) => {
    if (newLanguage === currentLanguage || isChanging) return;
    
    setIsChanging(true);
    
    try {
      // Change language in i18next
      await changeLanguage(newLanguage);
      
      // For App Router, language changes are handled by i18next and localStorage
      // No need to change routes
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  if (variant === 'buttons') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('settings.language', 'Language')}:
          </span>
        )}
        <div className="flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
          {supportedLanguages.map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              disabled={isChanging}
              className={`
                px-3 py-1 text-sm font-medium transition-colors
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                disabled:opacity-50 disabled:cursor-not-allowed
                ${currentLanguage === lang
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
                ${lang !== supportedLanguages[supportedLanguages.length - 1] ? 'border-r border-gray-300 dark:border-gray-600' : ''}
              `}
              aria-pressed={currentLanguage === lang}
              aria-label={`Switch to ${getLanguageName(lang)}`}
            >
              {getLanguageName(lang)}
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
          htmlFor="language-selector"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t('settings.language', 'Language')}:
        </label>
      )}
      <div className="relative">
        <select
          id="language-selector"
          value={currentLanguage}
          onChange={(e) => handleLanguageChange(e.target.value as Language)}
          disabled={isChanging}
          className="
            block w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 
            rounded-md shadow-sm bg-white dark:bg-gray-800 
            text-gray-900 dark:text-gray-100 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            appearance-none cursor-pointer
          "
          aria-label="Select language"
        >
          {supportedLanguages.map((lang) => (
            <option key={lang} value={lang}>
              {getLanguageName(lang)}
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
        
        {/* Loading indicator */}
        {isChanging && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-8">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageSelector;