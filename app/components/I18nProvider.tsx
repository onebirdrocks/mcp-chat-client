'use client';

import React, { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../lib/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
  initialLanguage?: string;
}

export function I18nProvider({ children, initialLanguage = 'en' }: I18nProviderProps) {
  useEffect(() => {
    // Initialize i18next with the detected language
    if (i18n.language !== initialLanguage) {
      i18n.changeLanguage(initialLanguage);
    }
  }, [initialLanguage]);

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}