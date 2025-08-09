import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { useSettingsStore } from '../store';
import type { Language } from '../types';

export type SupportedLanguage = Language;

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'zh'];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  zh: '中文',
};

export const useLanguage = () => {
  const { i18n } = useTranslation();
  const { preferences, changeLanguage: changeLanguageInStore } = useSettingsStore();

  const currentLanguage = preferences.language;

  const changeLanguage = useCallback(
    async (language: SupportedLanguage) => {
      try {
        await i18n.changeLanguage(language);
        // Update the settings store
        changeLanguageInStore(language);
      } catch (error) {
        console.error('Failed to change language:', error);
      }
    },
    [i18n, changeLanguageInStore]
  );

  const isLanguageSupported = useCallback(
    (language: string): language is SupportedLanguage => {
      return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
    },
    []
  );

  const getLanguageName = useCallback(
    (language: SupportedLanguage) => {
      return LANGUAGE_NAMES[language];
    },
    []
  );

  return {
    currentLanguage,
    changeLanguage,
    isLanguageSupported,
    getLanguageName,
    supportedLanguages: SUPPORTED_LANGUAGES,
    languageNames: LANGUAGE_NAMES,
  };
};