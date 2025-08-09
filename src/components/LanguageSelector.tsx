import React, { useState } from 'react';
import { useLanguage, type SupportedLanguage } from '../hooks/useLanguage';
import { useTranslation } from '../hooks/useTranslation';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'select' | 'buttons';
  showLabel?: boolean;
  disabled?: boolean;
  onLanguageChange?: (language: SupportedLanguage) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  className = '',
  variant = 'select',
  showLabel = true,
  disabled = false,
  onLanguageChange
}) => {
  const { tNs, isReady } = useTranslation();
  const { currentLanguage, changeLanguage, supportedLanguages, getLanguageName } = useLanguage();
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageChange = async (selectedLanguage: SupportedLanguage) => {
    if (selectedLanguage === currentLanguage || disabled || isChanging) return;
    
    setIsChanging(true);
    try {
      await changeLanguage(selectedLanguage);
      onLanguageChange?.(selectedLanguage);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLanguage = event.target.value as SupportedLanguage;
    handleLanguageChange(selectedLanguage);
  };

  if (!isReady) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-20 rounded"></div>
      </div>
    );
  }

  if (variant === 'buttons') {
    return (
      <div className={`flex flex-col space-y-2 ${className}`}>
        {showLabel && (
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {tNs.settings('language')}
          </label>
        )}
        <div className="flex space-x-2">
          {supportedLanguages.map((language) => (
            <button
              key={language}
              onClick={() => handleLanguageChange(language)}
              disabled={disabled || isChanging}
              className={`
                px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                ${currentLanguage === language
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }
                ${disabled || isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              `}
            >
              {isChanging && currentLanguage === language ? (
                <span className="flex items-center space-x-1">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{getLanguageName(language)}</span>
                </span>
              ) : (
                getLanguageName(language)
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {showLabel && (
        <label htmlFor="language-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {tNs.settings('language')}
        </label>
      )}
      <div className="relative">
        <select
          id="language-select"
          value={currentLanguage}
          onChange={handleSelectChange}
          disabled={disabled || isChanging}
          className={`
            w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
            dark:bg-gray-700 dark:border-gray-600 dark:text-white
            ${disabled || isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            transition-opacity duration-200
          `}
        >
          {supportedLanguages.map((language) => (
            <option key={language} value={language}>
              {getLanguageName(language)} ({tNs.languages(language as any)})
            </option>
          ))}
        </select>
        {isChanging && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-gray-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};