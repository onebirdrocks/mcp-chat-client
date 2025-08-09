import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from '../types';

/**
 * Language preference management hook
 * Language preferences are stored in localStorage (browser-specific)
 * while API keys and MCP servers are stored in backend configuration files
 */
export const useLanguagePreference = () => {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState<Language>('en');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('mcp-chat-ui-language') as Language;
    if (savedLanguage && ['en', 'zh'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
      i18n.changeLanguage(savedLanguage);
    } else {
      // Try to detect from browser
      const browserLanguage = navigator.language.toLowerCase();
      const detectedLanguage: Language = browserLanguage.startsWith('zh') ? 'zh' : 'en';
      setLanguage(detectedLanguage);
      i18n.changeLanguage(detectedLanguage);
    }
  }, [i18n]);

  // Change language and persist to localStorage
  const changeLanguage = async (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('mcp-chat-ui-language', newLanguage);
    await i18n.changeLanguage(newLanguage);
  };

  return {
    language,
    changeLanguage,
  };
};

/**
 * Initialize language on app startup
 */
export const initializeLanguage = async () => {
  const savedLanguage = localStorage.getItem('mcp-chat-ui-language') as Language;
  
  let language: Language;
  if (savedLanguage && ['en', 'zh'].includes(savedLanguage)) {
    language = savedLanguage;
  } else {
    // Try to detect from browser
    const browserLanguage = navigator.language.toLowerCase();
    language = browserLanguage.startsWith('zh') ? 'zh' : 'en';
  }
  
  // Apply language immediately
  const { default: i18n } = await import('../utils/i18n');
  await i18n.changeLanguage(language);
};